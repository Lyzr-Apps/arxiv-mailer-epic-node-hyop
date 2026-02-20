'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, triggerScheduleNow, listSchedules, cronToHuman } from '@/lib/scheduler'
import type { Schedule, ExecutionLog } from '@/lib/scheduler'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FiHome, FiBookOpen, FiSettings, FiSearch, FiSend, FiPlus, FiX, FiExternalLink, FiClock, FiMail, FiChevronDown, FiChevronUp, FiPlay, FiPause, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiBookmark, FiHash, FiCalendar, FiActivity, FiZap, FiChevronRight, FiArrowRight, FiCheck } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MANAGER_AGENT_ID = '6997cf886d697c9f3c2dac7f'
const ARXIV_AGENT_ID = '6997cf73b750be5d2dde15ec'
const EMAIL_AGENT_ID = '6997cf74ec13e82222688966'
const SCHEDULE_ID = '6997cf8d399dfadeac37c226'

const LS_TOPICS_KEY = 'arxiv_monitor_topics'
const LS_EMAIL_KEY = 'arxiv_monitor_email'
const LS_PREFS_KEY = 'arxiv_monitor_prefs'
const LS_LAST_DIGEST_KEY = 'arxiv_monitor_last_digest'
const LS_ONBOARDED_KEY = 'arxiv_monitor_onboarded'

const ARXIV_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/7/7a/ArXiv_logo_2022.png'

// Sidebar dark theme inline styles
const SIDEBAR_BG = { backgroundColor: 'hsl(220, 20%, 8%)' }
const SIDEBAR_BORDER = { borderColor: 'hsl(220, 15%, 15%)' }
const SIDEBAR_HOVER_BG = 'hsl(220, 15%, 15%)'
const SIDEBAR_TEXT = { color: 'hsl(40, 15%, 82%)' }
const SIDEBAR_TEXT_MUTED = { color: 'hsl(220, 10%, 50%)' }
const SIDEBAR_TEXT_ACTIVE = { color: 'hsl(40, 15%, 96%)' }

const CATEGORY_COLORS: Record<string, string> = {
  'Computer Science': 'hsl(355, 75%, 42%)',
  'Physics': 'hsl(220, 70%, 45%)',
  'Mathematics': 'hsl(280, 45%, 50%)',
  'Biology': 'hsl(150, 50%, 38%)',
  'AI Safety & Alignment': 'hsl(180, 45%, 35%)',
}

const SUGGESTED_TOPICS: Record<string, string[]> = {
  'Computer Science': [
    'Large Language Models', 'Computer Vision', 'Reinforcement Learning',
    'Natural Language Processing', 'Graph Neural Networks', 'Federated Learning',
    'Transformer Architecture', 'Neural Architecture Search', 'Few-Shot Learning',
    'Generative Adversarial Networks'
  ],
  'Physics': [
    'Quantum Computing', 'Dark Matter', 'Gravitational Waves',
    'Topological Insulators', 'Quantum Entanglement'
  ],
  'Mathematics': [
    'Algebraic Geometry', 'Number Theory', 'Differential Equations',
    'Topology', 'Category Theory'
  ],
  'Biology': [
    'Protein Folding', 'CRISPR Gene Editing', 'Single-Cell Sequencing',
    'Synthetic Biology', 'Computational Genomics'
  ],
  'AI Safety & Alignment': [
    'AI Alignment', 'Reinforcement Learning from Human Feedback',
    'Constitutional AI', 'Mechanistic Interpretability', 'Red Teaming LLMs'
  ]
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Paper {
  title: string
  authors: string
  abstract: string
  key_insight: string
  arxiv_link: string
  categories: string
}

interface TopicResult {
  topic: string
  papers_found: number
  papers: Paper[]
}

interface ManagerResponse {
  mode: string
  topics_searched: number
  total_papers_found: number
  topics_results: TopicResult[]
  email_sent: boolean
  email_status: string
  digest_date: string
}

interface DigestPrefs {
  includeAbstracts: boolean
  includeInsights: boolean
  includeAuthors: boolean
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_RESPONSE: ManagerResponse = {
  mode: 'preview_only',
  topics_searched: 3,
  total_papers_found: 6,
  topics_results: [
    {
      topic: 'Large Language Models',
      papers_found: 3,
      papers: [
        {
          title: 'Scaling Laws for Neural Language Models Revisited',
          authors: 'Jane Smith, John Doe, Alice Chen',
          abstract: 'We revisit scaling laws for large language models by examining how model performance changes with increased compute, data, and parameter count across different training regimes. Our findings suggest that previous scaling predictions underestimate the efficiency gains from architectural improvements.',
          key_insight: 'Architectural improvements can shift scaling curves by 2-3x, meaning smaller models can match the performance of models 3x their size.',
          arxiv_link: 'https://arxiv.org/abs/2401.00001',
          categories: 'cs.CL, cs.AI, cs.LG'
        },
        {
          title: 'Context Window Extension via Sparse Attention Patterns',
          authors: 'Robert Lee, Maria Garcia',
          abstract: 'We propose a novel sparse attention mechanism that allows transformer models to process context windows of up to 1 million tokens while maintaining sub-quadratic computational complexity. Our approach combines local and global attention patterns with learned routing.',
          key_insight: 'A hybrid sparse-dense attention pattern enables 1M token contexts with only 4x the compute of a 128K context model.',
          arxiv_link: 'https://arxiv.org/abs/2401.00002',
          categories: 'cs.CL, cs.AI'
        },
        {
          title: 'Instruction Tuning with Synthetic Data: Quality over Quantity',
          authors: 'Wei Zhang, Sarah Johnson, Michael Brown',
          abstract: 'We demonstrate that carefully curated synthetic instruction data can outperform large-scale human-annotated datasets for instruction tuning. Our pipeline uses a combination of self-play and automated quality filtering to produce high-quality training examples.',
          key_insight: 'Only 10K high-quality synthetic instructions can match the performance of 100K human-annotated examples.',
          arxiv_link: 'https://arxiv.org/abs/2401.00003',
          categories: 'cs.CL, cs.LG'
        }
      ]
    },
    {
      topic: 'Reinforcement Learning',
      papers_found: 2,
      papers: [
        {
          title: 'Model-Based RL with World Models for Robotic Manipulation',
          authors: 'David Kim, Yuki Tanaka',
          abstract: 'We introduce a world model architecture specifically designed for robotic manipulation tasks. Our approach learns a latent dynamics model from raw sensory observations, enabling sample-efficient learning of complex manipulation policies.',
          key_insight: 'World models reduce the required real-world interactions by 50x compared to model-free approaches in manipulation tasks.',
          arxiv_link: 'https://arxiv.org/abs/2401.00004',
          categories: 'cs.RO, cs.AI, cs.LG'
        },
        {
          title: 'Offline RL with Conservative Q-Learning: New Theoretical Bounds',
          authors: 'Emily Park, James Wilson',
          abstract: 'We provide tighter theoretical bounds for conservative Q-learning in the offline reinforcement learning setting. Our analysis reveals that the pessimism penalty can be significantly reduced while maintaining safety guarantees.',
          key_insight: 'New bounds suggest CQL can be 30% less conservative while maintaining the same safety guarantees, improving policy quality.',
          arxiv_link: 'https://arxiv.org/abs/2401.00005',
          categories: 'cs.LG, cs.AI, stat.ML'
        }
      ]
    },
    {
      topic: 'Quantum Computing',
      papers_found: 1,
      papers: [
        {
          title: 'Error Correction Codes for Near-Term Quantum Processors',
          authors: 'Priya Patel, Thomas Anderson',
          abstract: 'We develop a family of quantum error correction codes optimized for the noise characteristics of near-term superconducting quantum processors. Our codes achieve a 10x reduction in logical error rates compared to the surface code at the same physical qubit count.',
          key_insight: 'Tailoring error correction to specific hardware noise profiles yields dramatic improvements in logical qubit fidelity.',
          arxiv_link: 'https://arxiv.org/abs/2401.00006',
          categories: 'quant-ph, cs.IT'
        }
      ]
    }
  ],
  email_sent: false,
  email_status: 'not_requested',
  digest_date: '2025-01-20'
}

// ---------------------------------------------------------------------------
// Markdown Renderer
// ---------------------------------------------------------------------------

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Helper: compute next Monday 8AM IST
// ---------------------------------------------------------------------------

function computeNextScheduledRun(): string {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const istNow = new Date(utcNow + istOffset)
  const dayOfWeek = istNow.getDay()
  let daysUntilMonday = (1 - dayOfWeek + 7) % 7
  if (daysUntilMonday === 0) {
    const istHours = istNow.getHours()
    if (istHours >= 8) {
      daysUntilMonday = 7
    }
  }
  const nextMonday = new Date(istNow)
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
  nextMonday.setHours(8, 0, 0, 0)
  return nextMonday.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }) + ' IST'
}

// ---------------------------------------------------------------------------
// Onboarding Wizard
// ---------------------------------------------------------------------------

function OnboardingWizard({
  onComplete,
  addTopics,
  setEmailFn,
}: {
  onComplete: () => void
  addTopics: (topics: string[]) => void
  setEmailFn: (email: string) => void
}) {
  const [step, setStep] = useState(0)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  const handleComplete = () => {
    addTopics(selectedTopics)
    if (emailInput.trim()) {
      setEmailFn(emailInput.trim())
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_ONBOARDED_KEY, 'true')
    }
    onComplete()
  }

  const handleSkipEmail = () => {
    addTopics(selectedTopics)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_ONBOARDED_KEY, 'true')
    }
    onComplete()
  }

  const stepIndicators = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[0, 1, 2].map(s => (
        <div
          key={s}
          className={cn('w-2 h-2 transition-all duration-300', s === step ? 'w-6 bg-primary' : s < step ? 'bg-primary/60' : 'bg-border')}
        />
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(355, 75%, 42%, 0.08) 0%, hsl(220, 20%, 96%) 40%, hsl(180, 45%, 35%, 0.06) 100%)' }}>
      <div className="w-full max-w-2xl mx-4">
        <Card className="border border-border bg-card shadow-none">
          <CardContent className="p-8 md:p-12">
            {stepIndicators}

            {step === 0 && (
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <img
                    src={ARXIV_LOGO_URL}
                    alt="arXiv"
                    className="h-10 object-contain"
                  />
                </div>
                <h1 className="font-serif text-3xl font-bold tracking-[-0.03em] mb-3">
                  Welcome to Research Monitor
                </h1>
                <p className="text-muted-foreground font-sans text-sm leading-relaxed max-w-md mx-auto mb-8">
                  Stay on top of the latest research. Select your topics of interest, and we will deliver curated paper digests from ArXiv straight to your inbox every Monday.
                </p>
                <Button
                  className="shadow-none font-sans gap-2 px-8 py-5 text-sm"
                  onClick={() => setStep(1)}
                >
                  Get Started
                  <FiArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="font-serif text-2xl font-bold tracking-[-0.03em] mb-2">
                    What research areas interest you?
                  </h2>
                  <p className="text-muted-foreground font-sans text-sm">
                    Select at least one topic to continue.
                    {selectedTopics.length > 0 && (
                      <span className="ml-2 text-primary font-medium">{selectedTopics.length} selected</span>
                    )}
                  </p>
                </div>

                <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1">
                  {Object.entries(SUGGESTED_TOPICS).map(([category, catTopics]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-2 h-2" style={{ backgroundColor: CATEGORY_COLORS[category] ?? 'hsl(220, 10%, 45%)' }} />
                        <h4 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: CATEGORY_COLORS[category] ?? 'hsl(220, 10%, 45%)' }}>
                          {category}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {catTopics.map(topic => {
                          const isSelected = selectedTopics.includes(topic)
                          return (
                            <button
                              key={topic}
                              onClick={() => toggleTopic(topic)}
                              className={cn(
                                'text-xs font-sans px-3 py-1.5 border transition-all duration-150',
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-card text-foreground border-border hover:border-primary/40'
                              )}
                            >
                              {isSelected && <FiCheck className="w-3 h-3 inline mr-1" />}
                              {topic}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-8">
                  <Button
                    className="shadow-none font-sans gap-2 px-6"
                    disabled={selectedTopics.length === 0}
                    onClick={() => setStep(2)}
                  >
                    Continue
                    <FiArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="text-center mb-8">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(355, 75%, 42%, 0.1)' }}>
                    <FiMail className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold tracking-[-0.03em] mb-2">
                    Where should we send your digest?
                  </h2>
                  <p className="text-muted-foreground font-sans text-sm">
                    You will receive a curated paper digest every Monday at 8:00 AM IST.
                  </p>
                </div>

                <div className="max-w-sm mx-auto space-y-4">
                  <div>
                    <Label className="font-sans text-sm mb-1.5 block">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="you@university.edu"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="shadow-none font-sans"
                    />
                  </div>

                  <Button
                    className="w-full shadow-none font-sans gap-2"
                    onClick={handleComplete}
                    disabled={!emailInput.trim()}
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    Complete Setup
                  </Button>

                  <button
                    onClick={handleSkipEmail}
                    className="w-full text-center text-sm text-muted-foreground font-sans hover:text-foreground transition-colors py-2"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header Bar
// ---------------------------------------------------------------------------

function HeaderBar({
  screenTitle,
  email,
  scheduleActive,
}: {
  screenTitle: string
  email: string
  scheduleActive: boolean | null
}) {
  return (
    <div className="h-12 flex-shrink-0 border-b border-border bg-card flex items-center justify-between px-6">
      <h2 className="font-serif text-sm font-bold tracking-[-0.02em]">{screenTitle}</h2>
      <div className="flex items-center gap-3 text-xs font-sans">
        {email && (
          <>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FiMail className="w-3 h-3" />
              <span>{email}</span>
            </div>
            <span className="text-border">|</span>
          </>
        )}
        {scheduleActive !== null && (
          <div className="flex items-center gap-1.5">
            <div className={cn('w-1.5 h-1.5 rounded-full', scheduleActive ? 'bg-green-500' : 'bg-amber-500')} />
            <span className={cn('font-medium', scheduleActive ? 'text-green-700' : 'text-amber-700')}>
              {scheduleActive ? 'Active' : 'Paused'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PaperCard({ paper, expandedId, onToggle }: {
  paper: Paper
  expandedId: string | null
  onToggle: (id: string) => void
}) {
  const paperId = paper?.arxiv_link ?? paper?.title ?? ''
  const isExpanded = expandedId === paperId

  return (
    <div className="border border-border p-4 mb-3 bg-card hover:border-primary/20 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={paper?.arxiv_link ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-sm font-bold tracking-[-0.02em] hover:text-primary transition-colors inline-flex items-center gap-1.5"
          >
            {paper?.title ?? 'Untitled'}
            <FiExternalLink className="w-3 h-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            {paper?.authors ?? 'Unknown authors'}
          </p>
        </div>
      </div>

      {paper?.key_insight && (
        <div className="mt-3 border-l-2 pl-3" style={{ borderColor: 'hsl(180, 45%, 35%)' }}>
          <p className="text-xs font-sans font-semibold uppercase tracking-widest" style={{ color: 'hsl(180, 45%, 35%)' }}>
            Key Insight
          </p>
          <p className="text-sm font-sans leading-relaxed mt-0.5">
            {paper.key_insight}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {(paper?.categories ?? '').split(',').map((cat, idx) => {
            const trimmed = cat.trim()
            if (!trimmed) return null
            return (
              <Badge key={idx} variant="secondary" className="text-xs font-mono px-1.5 py-0">
                {trimmed}
              </Badge>
            )
          })}
        </div>
        <button
          onClick={() => onToggle(paperId)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-sans transition-colors"
        >
          {isExpanded ? 'Hide abstract' : 'Show abstract'}
          {isExpanded ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {isExpanded && paper?.abstract && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm font-sans leading-relaxed text-muted-foreground">
            {paper.abstract}
          </p>
        </div>
      )}
    </div>
  )
}

function DigestPreviewSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  )
}

function StatusMessage({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  if (!message) return null
  const config = {
    success: { icon: <FiCheckCircle className="w-4 h-4 flex-shrink-0" />, bg: 'bg-green-50 border-green-200 text-green-800' },
    error: { icon: <FiAlertCircle className="w-4 h-4 flex-shrink-0" />, bg: 'bg-red-50 border-red-200 text-red-800' },
    info: { icon: <FiActivity className="w-4 h-4 flex-shrink-0" />, bg: 'bg-blue-50 border-blue-200 text-blue-800' },
  }
  const c = config[type]
  return (
    <div className={cn('flex items-center gap-2 p-3 border text-sm font-sans', c.bg)}>
      {c.icon}
      <span>{message}</span>
    </div>
  )
}

function TopicSection({ topicResult, expandedPaper, onTogglePaper }: {
  topicResult: TopicResult
  expandedPaper: string | null
  onTogglePaper: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const papers = Array.isArray(topicResult?.papers) ? topicResult.papers : []

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-lg font-bold tracking-[-0.03em]">
            {topicResult?.topic ?? 'Unknown Topic'}
          </h3>
          <Badge variant="secondary" className="font-mono text-xs">
            {topicResult?.papers_found ?? 0}
          </Badge>
        </div>
        {collapsed ? <FiChevronDown className="w-4 h-4 text-muted-foreground" /> : <FiChevronUp className="w-4 h-4 text-muted-foreground" />}
      </button>
      {!collapsed && papers.map((paper, pIdx) => (
        <PaperCard
          key={paper?.arxiv_link ?? pIdx}
          paper={paper}
          expandedId={expandedPaper}
          onToggle={onTogglePaper}
        />
      ))}
      {!collapsed && papers.length === 0 && (
        <p className="text-sm text-muted-foreground font-sans italic">
          No papers found for this topic.
        </p>
      )}
      <Separator className="mt-4" />
    </div>
  )
}

function AgentInfoRow({ name, id, role, active }: {
  name: string
  id: string
  role: string
  active: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={cn('w-2 h-2 rounded-full', active ? 'bg-green-500' : 'bg-muted-foreground/30')} />
        <div>
          <p className="text-sm font-sans font-medium">{name}</p>
          <p className="text-xs text-muted-foreground font-mono">{role}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-mono">{id.slice(0, 8)}...</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Screen
// ---------------------------------------------------------------------------

function DashboardScreen({
  topics,
  digestResponse,
  loading,
  loadingText,
  statusMsg,
  onPreview,
  onSendNow,
  showSample,
}: {
  topics: string[]
  digestResponse: ManagerResponse | null
  loading: boolean
  loadingText: string
  statusMsg: { type: 'success' | 'error' | 'info'; message: string } | null
  onPreview: () => void
  onSendNow: () => void
  showSample: boolean
}) {
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null)
  const [lastDigest, setLastDigest] = useState<string>('')
  const [nextRun, setNextRun] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLastDigest(localStorage.getItem(LS_LAST_DIGEST_KEY) ?? '')
      setNextRun(computeNextScheduledRun())
    }
  }, [])

  const togglePaper = (id: string) => {
    setExpandedPaper(prev => prev === id ? null : id)
  }

  const displayResponse = showSample ? SAMPLE_RESPONSE : digestResponse

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Hero heading */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold tracking-[-0.03em] mb-1">Dashboard</h1>
        <p className="font-sans text-muted-foreground text-sm leading-relaxed">
          Monitor and manage your ArXiv research digest pipeline.
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border shadow-none relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5" style={{ backgroundColor: 'hsl(355, 75%, 42%, 0.08)' }}>
                <FiClock className="w-4 h-4" style={{ color: 'hsl(355, 75%, 42%)' }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest font-medium">Last Digest</p>
                <p className="text-sm font-sans font-semibold mt-0.5">
                  {lastDigest || 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5" style={{ backgroundColor: 'hsl(180, 45%, 35%, 0.08)' }}>
                <FiCalendar className="w-4 h-4" style={{ color: 'hsl(180, 45%, 35%)' }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest font-medium">Next Scheduled</p>
                <p className="text-sm font-sans font-semibold mt-0.5">
                  {nextRun || 'Calculating...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5" style={{ backgroundColor: 'hsl(355, 75%, 42%, 0.08)' }}>
                <FiBookmark className="w-4 h-4" style={{ color: 'hsl(355, 75%, 42%)' }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest font-medium">Active Topics</p>
                <p className="text-sm font-sans font-semibold mt-0.5">
                  {topics.length} topic{topics.length !== 1 ? 's' : ''} tracked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status message */}
      {statusMsg && <div className="mb-6"><StatusMessage type={statusMsg.type} message={statusMsg.message} /></div>}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Topics + Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base tracking-[-0.02em]">Active Topics</CardTitle>
            </CardHeader>
            <CardContent>
              {topics.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  No topics added yet. Head to the Topics section to add research topics.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <Badge key={topic} variant="outline" className="font-sans text-xs px-2 py-1">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base tracking-[-0.02em]">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full shadow-none justify-start gap-2 font-sans"
                disabled={loading || topics.length === 0}
                onClick={onPreview}
              >
                <FiSearch className="w-4 h-4" />
                Preview Digest
              </Button>
              <Button
                className="w-full shadow-none justify-start gap-2 font-sans"
                disabled={loading || topics.length === 0}
                onClick={onSendNow}
              >
                <FiSend className="w-4 h-4" />
                Send Digest Now
              </Button>
              {topics.length === 0 && (
                <p className="text-xs text-muted-foreground font-sans">
                  Add topics first to use these actions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Digest Preview */}
        <div className="lg:col-span-2">
          <Card className="border shadow-none overflow-hidden">
            {/* Accent line at top */}
            <div className="h-0.5 w-full bg-primary" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-base tracking-[-0.02em]">
                  Digest Preview
                </CardTitle>
                {displayResponse && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-sans">
                    <span>{displayResponse.topics_searched ?? 0} topics</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{displayResponse.total_papers_found ?? 0} papers</span>
                    {displayResponse.digest_date && (
                      <>
                        <Separator orientation="vertical" className="h-3" />
                        <span>{displayResponse.digest_date}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiRefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-sans text-muted-foreground">{loadingText}</span>
                  </div>
                  <DigestPreviewSkeleton />
                </div>
              ) : displayResponse ? (
                <ScrollArea className="h-[600px]">
                  <div className="p-6 space-y-6">
                    {/* Mode badge */}
                    {displayResponse.mode && (
                      <div className="flex items-center gap-2">
                        <Badge variant={displayResponse.mode === 'full_digest' ? 'default' : 'secondary'} className="font-sans text-xs">
                          {displayResponse.mode === 'full_digest' ? 'Full Digest' : 'Preview Only'}
                        </Badge>
                        {displayResponse.email_sent && (
                          <Badge variant="outline" className="font-sans text-xs border-green-300 text-green-700">
                            Email Sent
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Email status */}
                    {displayResponse.email_status && displayResponse.email_status !== 'not_requested' && (
                      <StatusMessage
                        type={displayResponse.email_sent ? 'success' : 'info'}
                        message={'Email: ' + displayResponse.email_status}
                      />
                    )}

                    {/* Topic results */}
                    {Array.isArray(displayResponse.topics_results) && displayResponse.topics_results.map((topicResult, idx) => (
                      <TopicSection
                        key={topicResult?.topic ?? idx}
                        topicResult={topicResult}
                        expandedPaper={expandedPaper}
                        onTogglePaper={togglePaper}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(355, 75%, 42%, 0.06)' }}>
                    <FiBookOpen className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm font-sans font-medium mb-1">
                    {topics.length === 0 ? 'No topics configured' : 'Ready to search'}
                  </p>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed max-w-xs mx-auto">
                    {topics.length === 0
                      ? 'Head to Topics to add your research interests, then return here to preview your digest.'
                      : 'Click "Preview Digest" to search ArXiv for your tracked topics.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Topics Screen
// ---------------------------------------------------------------------------

function TopicsScreen({
  topics,
  onAddTopic,
  onRemoveTopic,
}: {
  topics: string[]
  onAddTopic: (topic: string) => void
  onRemoveTopic: (topic: string) => void
}) {
  const [newTopic, setNewTopic] = useState('')

  const handleAdd = () => {
    const trimmed = newTopic.trim()
    if (trimmed && !topics.includes(trimmed)) {
      onAddTopic(trimmed)
      setNewTopic('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold tracking-[-0.03em] mb-1">Topics</h1>
          <p className="font-sans text-muted-foreground text-sm leading-relaxed">
            Manage the research topics you want to monitor on ArXiv.
          </p>
        </div>

        {/* Active Topics */}
        <Card className="border shadow-none mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-[-0.02em]">
              Your Active Topics
              {topics.length > 0 && (
                <span className="ml-2 text-muted-foreground font-sans text-sm font-normal">
                  ({topics.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {topics.length === 0 ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'hsl(355, 75%, 42%, 0.06)' }}>
                  <FiBookmark className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground font-sans">
                  No topics added yet. Add custom topics or browse suggestions below.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Badge
                    key={topic}
                    variant="outline"
                    className="font-sans text-sm px-3 py-1.5 flex items-center gap-1.5"
                  >
                    {topic}
                    <button
                      onClick={() => onRemoveTopic(topic)}
                      className="hover:text-destructive transition-colors"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Custom Topic */}
        <Card className="border shadow-none mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-[-0.02em]">Add Custom Topic</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Diffusion Models, Protein Structure Prediction..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                className="shadow-none font-sans"
              />
              <Button
                onClick={handleAdd}
                disabled={!newTopic.trim()}
                className="shadow-none font-sans gap-1.5"
              >
                <FiPlus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggested Topics */}
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-[-0.02em]">Suggested Topics</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-6">
            {Object.entries(SUGGESTED_TOPICS).map(([category, suggestedTopics]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2" style={{ backgroundColor: CATEGORY_COLORS[category] ?? 'hsl(220, 10%, 45%)' }} />
                  <h4 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: CATEGORY_COLORS[category] ?? 'hsl(220, 10%, 45%)' }}>
                    {category}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.map((topic) => {
                    const isAdded = topics.includes(topic)
                    return (
                      <button
                        key={topic}
                        onClick={() => {
                          if (!isAdded) onAddTopic(topic)
                        }}
                        disabled={isAdded}
                        className={cn(
                          'text-xs font-sans px-3 py-1.5 border transition-all duration-150',
                          isAdded
                            ? 'bg-primary text-primary-foreground border-primary cursor-default'
                            : 'bg-card text-foreground border-border hover:border-primary/40 hover:scale-[1.02] cursor-pointer'
                        )}
                      >
                        {isAdded ? topic + ' \u2713' : topic}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings Screen
// ---------------------------------------------------------------------------

function SettingsScreen({
  email,
  onSetEmail,
  prefs,
  onSetPrefs,
  activeAgentId,
}: {
  email: string
  onSetEmail: (email: string) => void
  prefs: DigestPrefs
  onSetPrefs: (prefs: DigestPrefs) => void
  activeAgentId: string | null
}) {
  const [emailInput, setEmailInput] = useState(email)
  const [emailSaved, setEmailSaved] = useState(false)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleActionMsg, setScheduleActionMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)

  const loadScheduleData = useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError('')
    try {
      const result = await listSchedules({ agentId: MANAGER_AGENT_ID })
      if (result.success && Array.isArray(result.schedules) && result.schedules.length > 0) {
        const found = result.schedules.find(s => s.id === SCHEDULE_ID) ?? result.schedules[0]
        setSchedule(found)
      } else {
        const single = await getSchedule(SCHEDULE_ID)
        if (single.success && single.schedule) {
          setSchedule(single.schedule)
        } else {
          setScheduleError('Could not load schedule data.')
        }
      }
    } catch {
      setScheduleError('Failed to fetch schedule data.')
    }
    setScheduleLoading(false)
  }, [])

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const result = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
      if (result.success && Array.isArray(result.executions)) {
        setLogs(result.executions)
      }
    } catch {
      // silent
    }
    setLogsLoading(false)
  }, [])

  useEffect(() => {
    loadScheduleData()
    loadLogs()
  }, [loadScheduleData, loadLogs])

  useEffect(() => {
    setEmailInput(email)
  }, [email])

  const handleSaveEmail = () => {
    onSetEmail(emailInput)
    setEmailSaved(true)
    setTimeout(() => setEmailSaved(false), 3000)
  }

  const handleToggleSchedule = async () => {
    if (!schedule) return
    setToggleLoading(true)
    setScheduleActionMsg(null)
    try {
      if (schedule.is_active) {
        const result = await pauseSchedule(schedule.id)
        if (result.success) {
          setScheduleActionMsg({ type: 'success', message: 'Schedule paused successfully.' })
        } else {
          setScheduleActionMsg({ type: 'error', message: result.error ?? 'Failed to pause schedule.' })
        }
      } else {
        const result = await resumeSchedule(schedule.id)
        if (result.success) {
          setScheduleActionMsg({ type: 'success', message: 'Schedule resumed successfully.' })
        } else {
          setScheduleActionMsg({ type: 'error', message: result.error ?? 'Failed to resume schedule.' })
        }
      }
      await loadScheduleData()
    } catch {
      setScheduleActionMsg({ type: 'error', message: 'Network error while toggling schedule.' })
    }
    setToggleLoading(false)
  }

  const handleTriggerNow = async () => {
    if (!schedule) return
    setTriggerLoading(true)
    setScheduleActionMsg(null)
    try {
      const result = await triggerScheduleNow(schedule.id)
      if (result.success) {
        setScheduleActionMsg({ type: 'success', message: 'Schedule triggered. The digest will be processed shortly.' })
      } else {
        setScheduleActionMsg({ type: 'error', message: result.error ?? 'Failed to trigger schedule.' })
      }
    } catch {
      setScheduleActionMsg({ type: 'error', message: 'Network error while triggering schedule.' })
    }
    setTriggerLoading(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold tracking-[-0.03em] mb-1">Settings</h1>
          <p className="font-sans text-muted-foreground text-sm leading-relaxed">
            Configure email delivery, digest format, and schedule management.
          </p>
        </div>

        {/* Email */}
        <Card className="border shadow-none mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-[-0.02em] flex items-center gap-2">
              <FiMail className="w-4 h-4 text-primary" />
              Email Delivery
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="font-sans text-sm mb-1.5 block">Recipient Email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="shadow-none font-sans"
                />
                <Button
                  onClick={handleSaveEmail}
                  variant="outline"
                  className="shadow-none font-sans"
                >
                  Save
                </Button>
              </div>
              {emailSaved && (
                <p className="text-xs mt-1 font-sans" style={{ color: 'hsl(150, 50%, 38%)' }}>Email saved successfully.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Digest Preferences */}
        <Card className="border shadow-none mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-[-0.02em] flex items-center gap-2">
              <FiBookOpen className="w-4 h-4" style={{ color: 'hsl(180, 45%, 35%)' }} />
              Digest Format
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-sans text-sm">Include Abstracts</Label>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  Show paper abstracts in the digest email.
                </p>
              </div>
              <Switch
                checked={prefs.includeAbstracts}
                onCheckedChange={(checked) =>
                  onSetPrefs({ ...prefs, includeAbstracts: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-sans text-sm">Include Key Insights</Label>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  Highlight the key insight from each paper.
                </p>
              </div>
              <Switch
                checked={prefs.includeInsights}
                onCheckedChange={(checked) =>
                  onSetPrefs({ ...prefs, includeInsights: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-sans text-sm">Include Author Names</Label>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  Show author names for each paper.
                </p>
              </div>
              <Switch
                checked={prefs.includeAuthors}
                onCheckedChange={(checked) =>
                  onSetPrefs({ ...prefs, includeAuthors: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule Management */}
        <Card className="border shadow-none mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-[-0.02em] flex items-center gap-2">
              <FiCalendar className="w-4 h-4" style={{ color: 'hsl(220, 70%, 45%)' }} />
              Schedule Management
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            {scheduleActionMsg && (
              <StatusMessage type={scheduleActionMsg.type} message={scheduleActionMsg.message} />
            )}

            {scheduleLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-8 w-32" />
              </div>
            ) : scheduleError ? (
              <div>
                <StatusMessage type="error" message={scheduleError} />
                <Button variant="outline" className="mt-3 shadow-none font-sans" onClick={loadScheduleData}>
                  <FiRefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            ) : schedule ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-1 font-medium">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', schedule.is_active ? 'bg-green-500' : 'bg-amber-500')} />
                      <span className="text-sm font-sans font-semibold">
                        {schedule.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-1 font-medium">Frequency</p>
                    <p className="text-sm font-sans font-semibold">
                      {schedule.cron_expression ? cronToHuman(schedule.cron_expression) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-1 font-medium">Timezone</p>
                    <p className="text-sm font-sans font-semibold">{schedule.timezone ?? 'Asia/Kolkata'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-1 font-medium">Next Run</p>
                    <p className="text-sm font-sans font-semibold">
                      {schedule.next_run_time
                        ? new Date(schedule.next_run_time).toLocaleString()
                        : 'Not scheduled'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant={schedule.is_active ? 'outline' : 'default'}
                    className="shadow-none font-sans gap-1.5"
                    disabled={toggleLoading}
                    onClick={handleToggleSchedule}
                  >
                    {toggleLoading ? (
                      <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : schedule.is_active ? (
                      <FiPause className="w-3.5 h-3.5" />
                    ) : (
                      <FiPlay className="w-3.5 h-3.5" />
                    )}
                    {schedule.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                  </Button>
                  <Button
                    variant="outline"
                    className="shadow-none font-sans gap-1.5"
                    disabled={triggerLoading}
                    onClick={handleTriggerNow}
                  >
                    {triggerLoading ? (
                      <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FiZap className="w-3.5 h-3.5" />
                    )}
                    Run Now
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground font-sans">No schedule found.</p>
            )}
          </CardContent>
        </Card>

        {/* Run History */}
        <Card className="border shadow-none mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base tracking-[-0.02em] flex items-center gap-2">
                <FiActivity className="w-4 h-4" style={{ color: 'hsl(35, 80%, 50%)' }} />
                Run History
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="shadow-none font-sans text-xs gap-1"
                onClick={loadLogs}
                disabled={logsLoading}
              >
                <FiRefreshCw className={cn('w-3 h-3', logsLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-6 text-center">
                <FiActivity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-sans">
                  No execution history yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border border-border bg-background">
                    <div className="flex items-center gap-3">
                      {log.success ? (
                        <FiCheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(150, 50%, 38%)' }} />
                      ) : (
                        <FiAlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-sans font-medium">
                          {log.success ? 'Completed' : 'Failed'}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {log.executed_at ? new Date(log.executed_at).toLocaleString() : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Attempt {log.attempt ?? 1}/{log.max_attempts ?? 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Info */}
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-[-0.02em]">Agent Information</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="space-y-3">
              <AgentInfoRow
                name="Research Digest Coordinator"
                id={MANAGER_AGENT_ID}
                role="Manager"
                active={activeAgentId === MANAGER_AGENT_ID}
              />
              <AgentInfoRow
                name="ArXiv Research Agent"
                id={ARXIV_AGENT_ID}
                role="Sub-agent"
                active={activeAgentId === ARXIV_AGENT_ID}
              />
              <AgentInfoRow
                name="Email Digest Agent"
                id={EMAIL_AGENT_ID}
                role="Sub-agent"
                active={activeAgentId === EMAIL_AGENT_ID}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Page() {
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'topics' | 'settings'>('dashboard')
  const [topics, setTopics] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState<DigestPrefs>({
    includeAbstracts: true,
    includeInsights: true,
    includeAuthors: true,
  })
  const [digestResponse, setDigestResponse] = useState<ManagerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [scheduleActive, setScheduleActive] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true)
      try {
        const savedTopics = localStorage.getItem(LS_TOPICS_KEY)
        if (savedTopics) {
          const parsed = JSON.parse(savedTopics)
          if (Array.isArray(parsed)) setTopics(parsed)
        }
      } catch { /* ignore */ }
      try {
        const savedEmail = localStorage.getItem(LS_EMAIL_KEY)
        if (savedEmail) setEmail(savedEmail)
      } catch { /* ignore */ }
      try {
        const savedPrefs = localStorage.getItem(LS_PREFS_KEY)
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs)
          if (parsed && typeof parsed === 'object') {
            setPrefs(prev => ({ ...prev, ...parsed }))
          }
        }
      } catch { /* ignore */ }

      // Check onboarding
      const onboarded = localStorage.getItem(LS_ONBOARDED_KEY)
      if (onboarded !== 'true') {
        setShowOnboarding(true)
      }
    }
  }, [])

  // Fetch schedule status for header
  useEffect(() => {
    async function fetchScheduleStatus() {
      try {
        const result = await listSchedules({ agentId: MANAGER_AGENT_ID })
        if (result.success && Array.isArray(result.schedules) && result.schedules.length > 0) {
          const found = result.schedules.find(s => s.id === SCHEDULE_ID) ?? result.schedules[0]
          setScheduleActive(found.is_active)
        }
      } catch {
        // silent
      }
    }
    fetchScheduleStatus()
  }, [])

  // Persist topics
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_TOPICS_KEY, JSON.stringify(topics))
    }
  }, [topics])

  // Persist email
  useEffect(() => {
    if (typeof window !== 'undefined' && email) {
      localStorage.setItem(LS_EMAIL_KEY, email)
    }
  }, [email])

  // Persist prefs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_PREFS_KEY, JSON.stringify(prefs))
    }
  }, [prefs])

  const addTopic = (topic: string) => {
    setTopics(prev => {
      if (prev.includes(topic)) return prev
      return [...prev, topic]
    })
  }

  const addMultipleTopics = (newTopics: string[]) => {
    setTopics(prev => {
      const combined = [...prev]
      for (const t of newTopics) {
        if (!combined.includes(t)) {
          combined.push(t)
        }
      }
      return combined
    })
  }

  const removeTopic = (topic: string) => {
    setTopics(prev => prev.filter(t => t !== topic))
  }

  const parseManagerResponse = (result: any): ManagerResponse | null => {
    try {
      const raw = result?.response
      let parsed: any = null
      if (raw?.result) {
        if (typeof raw.result === 'string') {
          parsed = JSON.parse(raw.result)
        } else {
          parsed = raw.result
        }
      } else if (raw?.message) {
        try {
          parsed = JSON.parse(raw.message)
        } catch {
          return null
        }
      }
      if (parsed && typeof parsed === 'object') {
        return parsed as ManagerResponse
      }
    } catch (e) {
      console.error('Failed to parse agent response:', e)
    }
    return null
  }

  const handlePreview = async () => {
    if (topics.length === 0) return
    setLoading(true)
    setLoadingText('Searching ArXiv for your topics...')
    setStatusMsg(null)
    setDigestResponse(null)
    setActiveAgentId(MANAGER_AGENT_ID)

    try {
      const message = 'Search ArXiv for the following topics: [' + topics.join(', ') + ']. Mode: preview_only. Do NOT send email.'
      const result = await callAIAgent(message, MANAGER_AGENT_ID)

      if (result.success) {
        const parsed = parseManagerResponse(result)
        if (parsed) {
          setDigestResponse(parsed)
          setStatusMsg({
            type: 'success',
            message: 'Found ' + (parsed.total_papers_found ?? 0) + ' papers across ' + (parsed.topics_searched ?? 0) + ' topics.'
          })
        } else {
          setStatusMsg({ type: 'error', message: 'Failed to parse the agent response. The response format was unexpected.' })
        }
      } else {
        setStatusMsg({ type: 'error', message: result.error ?? 'Failed to search ArXiv. Please try again.' })
      }
    } catch {
      setStatusMsg({ type: 'error', message: 'Network error. Please check your connection and try again.' })
    }

    setLoading(false)
    setActiveAgentId(null)
  }

  const handleSendNow = async () => {
    if (topics.length === 0) return
    if (!email) {
      setStatusMsg({ type: 'error', message: 'Please set your email address in Settings before sending a digest.' })
      return
    }
    setLoading(true)
    setLoadingText('Searching topics and preparing email digest...')
    setStatusMsg(null)
    setDigestResponse(null)
    setActiveAgentId(MANAGER_AGENT_ID)

    try {
      const message = 'Search ArXiv for the following topics: [' + topics.join(', ') + ']. Mode: full_digest. Send email digest to: ' + email + '. Include abstracts: ' + (prefs.includeAbstracts ? 'yes' : 'no') + '. Include key insights: ' + (prefs.includeInsights ? 'yes' : 'no') + '. Include author names: ' + (prefs.includeAuthors ? 'yes' : 'no') + '.'
      const result = await callAIAgent(message, MANAGER_AGENT_ID)

      if (result.success) {
        const parsed = parseManagerResponse(result)
        if (parsed) {
          setDigestResponse(parsed)
          const now = new Date().toLocaleString()
          if (typeof window !== 'undefined') {
            localStorage.setItem(LS_LAST_DIGEST_KEY, now)
          }
          if (parsed.email_sent) {
            setStatusMsg({ type: 'success', message: 'Digest sent successfully to ' + email + '. ' + (parsed.total_papers_found ?? 0) + ' papers included.' })
          } else {
            setStatusMsg({
              type: 'info',
              message: 'Digest prepared with ' + (parsed.total_papers_found ?? 0) + ' papers. Email status: ' + (parsed.email_status ?? 'unknown')
            })
          }
        } else {
          setStatusMsg({ type: 'error', message: 'Failed to parse the agent response.' })
        }
      } else {
        setStatusMsg({ type: 'error', message: result.error ?? 'Failed to send digest. Please try again.' })
      }
    } catch {
      setStatusMsg({ type: 'error', message: 'Network error. Please check your connection and try again.' })
    }

    setLoading(false)
    setActiveAgentId(null)
  }

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: FiHome },
    { id: 'topics' as const, label: 'Topics', icon: FiBookOpen },
    { id: 'settings' as const, label: 'Settings', icon: FiSettings },
  ]

  const screenTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    topics: 'Topics',
    settings: 'Settings',
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-sans">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(false)}
          addTopics={addMultipleTopics}
          setEmailFn={setEmail}
        />
      )}

      <div className="h-screen flex overflow-hidden bg-background text-foreground">
        {/* Dark Sidebar */}
        <aside className="h-screen flex flex-col flex-shrink-0 w-64 border-r" style={{ ...SIDEBAR_BG, ...SIDEBAR_BORDER }}>
          {/* Logo section */}
          <div className="p-5 border-b" style={SIDEBAR_BORDER}>
            <img
              src={ARXIV_LOGO_URL}
              alt="arXiv"
              className="h-7 object-contain brightness-0 invert"
            />
            <p className="text-xs mt-1.5 font-sans" style={SIDEBAR_TEXT_MUTED}>
              Research Monitor
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-sans transition-colors relative"
                  style={isActive ? SIDEBAR_TEXT_ACTIVE : SIDEBAR_TEXT}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = SIDEBAR_HOVER_BG
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1 bottom-1 w-0.5" style={{ backgroundColor: 'hsl(355, 75%, 50%)' }} />
                  )}
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Sample Data Toggle */}
          <div className="border-t px-5 py-4" style={SIDEBAR_BORDER}>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-sans" style={SIDEBAR_TEXT_MUTED}>Sample Data</Label>
              <Switch
                checked={showSample}
                onCheckedChange={setShowSample}
              />
            </div>
          </div>

          {/* Agent status */}
          <div className="border-t px-5 py-4" style={SIDEBAR_BORDER}>
            <p className="text-xs font-sans uppercase tracking-widest mb-3 font-medium" style={SIDEBAR_TEXT_MUTED}>Agents</p>
            <div className="space-y-2">
              {[
                { name: 'Coordinator', id: MANAGER_AGENT_ID },
                { name: 'ArXiv Agent', id: ARXIV_AGENT_ID },
                { name: 'Email Agent', id: EMAIL_AGENT_ID },
              ].map(agent => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5 rounded-full', activeAgentId === agent.id ? 'bg-green-400 animate-pulse' : 'bg-white/15')} />
                  <span className="text-xs font-sans" style={SIDEBAR_TEXT_MUTED}>{agent.name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-screen flex flex-col min-w-0">
          {/* Header Bar */}
          <HeaderBar
            screenTitle={screenTitles[activeScreen] ?? 'Dashboard'}
            email={email}
            scheduleActive={scheduleActive}
          />

          {/* Screen content */}
          <div className="flex-1 overflow-y-auto">
            {activeScreen === 'dashboard' && (
              <DashboardScreen
                topics={topics}
                digestResponse={digestResponse}
                loading={loading}
                loadingText={loadingText}
                statusMsg={statusMsg}
                onPreview={handlePreview}
                onSendNow={handleSendNow}
                showSample={showSample}
              />
            )}
            {activeScreen === 'topics' && (
              <TopicsScreen
                topics={topics}
                onAddTopic={addTopic}
                onRemoveTopic={removeTopic}
              />
            )}
            {activeScreen === 'settings' && (
              <SettingsScreen
                email={email}
                onSetEmail={setEmail}
                prefs={prefs}
                onSetPrefs={setPrefs}
                activeAgentId={activeAgentId}
              />
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
