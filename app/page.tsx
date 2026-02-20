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
import { FiHome, FiBookOpen, FiSettings, FiSearch, FiSend, FiPlus, FiX, FiExternalLink, FiClock, FiMail, FiChevronDown, FiChevronUp, FiPlay, FiPause, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiBookmark, FiHash, FiCalendar, FiActivity, FiZap, FiChevronLeft } from 'react-icons/fi'

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
              className="px-4 py-2 bg-primary text-primary-foreground rounded-none text-sm"
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
    <div className="border border-border p-4 mb-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={paper?.arxiv_link ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-sm font-bold tracking-tight hover:underline decoration-1 underline-offset-2 inline-flex items-center gap-1"
          >
            {paper?.title ?? 'Untitled'}
            <FiExternalLink className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
          </a>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            {paper?.authors ?? 'Unknown authors'}
          </p>
        </div>
      </div>

      {paper?.key_insight && (
        <div className="mt-3 border-l-2 pl-3" style={{ borderColor: 'hsl(0, 80%, 45%)' }}>
          <p className="text-xs font-sans font-medium" style={{ color: 'hsl(0, 80%, 45%)' }}>
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
              <Badge key={idx} variant="secondary" className="text-xs rounded-none font-mono px-1.5 py-0">
                {trimmed}
              </Badge>
            )
          })}
        </div>
        <button
          onClick={() => onToggle(paperId)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-sans"
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
          <Skeleton className="h-5 w-48 rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
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
    <div className={cn('flex items-center gap-2 p-3 border text-sm font-sans rounded-none', c.bg)}>
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
          <h3 className="font-serif text-lg font-bold tracking-tight">
            {topicResult?.topic ?? 'Unknown Topic'}
          </h3>
          <Badge variant="secondary" className="rounded-none font-mono text-xs">
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="font-sans text-muted-foreground mt-1 text-sm leading-relaxed">
          Monitor and manage your ArXiv research digest pipeline.
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border rounded-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary">
                <FiClock className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Last Digest Sent</p>
                <p className="text-sm font-sans font-medium mt-0.5">
                  {lastDigest || 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border rounded-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary">
                <FiCalendar className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Next Scheduled</p>
                <p className="text-sm font-sans font-medium mt-0.5">
                  {nextRun || 'Calculating...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border rounded-none shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary">
                <FiBookmark className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Active Topics</p>
                <p className="text-sm font-sans font-medium mt-0.5">
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
          <Card className="border rounded-none shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base tracking-tight">Active Topics</CardTitle>
            </CardHeader>
            <CardContent>
              {topics.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  No topics added yet. Head to the Topics section to add research topics.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <Badge key={topic} variant="outline" className="rounded-none font-sans text-xs px-2 py-1">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border rounded-none shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base tracking-tight">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full rounded-none shadow-none justify-start gap-2 font-sans"
                disabled={loading || topics.length === 0}
                onClick={onPreview}
              >
                <FiSearch className="w-4 h-4" />
                Preview Digest
              </Button>
              <Button
                className="w-full rounded-none shadow-none justify-start gap-2 font-sans"
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
          <Card className="border rounded-none shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-base tracking-tight">
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
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
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
                        <Badge variant={displayResponse.mode === 'full_digest' ? 'default' : 'secondary'} className="rounded-none font-sans text-xs">
                          {displayResponse.mode === 'full_digest' ? 'Full Digest' : 'Preview Only'}
                        </Badge>
                        {displayResponse.email_sent && (
                          <Badge variant="outline" className="rounded-none font-sans text-xs border-green-300 text-green-700">
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
                <div className="p-12 text-center">
                  <FiBookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                    {topics.length === 0
                      ? 'No topics added yet. Head to Topics to get started.'
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
          <h1 className="font-serif text-3xl font-bold tracking-tight">Topics</h1>
          <p className="font-sans text-muted-foreground mt-1 text-sm leading-relaxed">
            Manage the research topics you want to monitor on ArXiv.
          </p>
        </div>

        {/* Active Topics */}
        <Card className="border rounded-none shadow-none mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-tight">
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
              <p className="text-sm text-muted-foreground font-sans">
                No topics added yet. Add custom topics or browse suggestions below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Badge
                    key={topic}
                    variant="outline"
                    className="rounded-none font-sans text-sm px-3 py-1.5 flex items-center gap-1.5"
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
        <Card className="border rounded-none shadow-none mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-tight">Add Custom Topic</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Diffusion Models, Protein Structure Prediction..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                className="rounded-none shadow-none font-sans"
              />
              <Button
                onClick={handleAdd}
                disabled={!newTopic.trim()}
                className="rounded-none shadow-none font-sans gap-1.5"
              >
                <FiPlus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggested Topics */}
        <Card className="border rounded-none shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-tight">Suggested Topics</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-6">
            {Object.entries(SUGGESTED_TOPICS).map(([category, suggestedTopics]) => (
              <div key={category}>
                <h4 className="font-serif text-sm font-bold tracking-tight mb-3 flex items-center gap-2">
                  <FiHash className="w-3.5 h-3.5 text-muted-foreground" />
                  {category}
                </h4>
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
                          'text-xs font-sans px-3 py-1.5 border transition-colors',
                          isAdded
                            ? 'bg-primary text-primary-foreground border-primary cursor-default'
                            : 'bg-card text-foreground border-border hover:bg-secondary cursor-pointer'
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
}: {
  email: string
  onSetEmail: (email: string) => void
  prefs: DigestPrefs
  onSetPrefs: (prefs: DigestPrefs) => void
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

  // Sync emailInput when parent email changes
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
          <h1 className="font-serif text-3xl font-bold tracking-tight">Settings</h1>
          <p className="font-sans text-muted-foreground mt-1 text-sm leading-relaxed">
            Configure email delivery, digest format, and schedule management.
          </p>
        </div>

        {/* Email */}
        <Card className="border rounded-none shadow-none mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
              <FiMail className="w-4 h-4" />
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
                  className="rounded-none shadow-none font-sans"
                />
                <Button
                  onClick={handleSaveEmail}
                  variant="outline"
                  className="rounded-none shadow-none font-sans"
                >
                  Save
                </Button>
              </div>
              {emailSaved && (
                <p className="text-xs text-green-700 mt-1 font-sans">Email saved successfully.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Digest Preferences */}
        <Card className="border rounded-none shadow-none mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
              <FiBookOpen className="w-4 h-4" />
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
        <Card className="border rounded-none shadow-none mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
              <FiCalendar className="w-4 h-4" />
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
                <Skeleton className="h-5 w-48 rounded-none" />
                <Skeleton className="h-5 w-64 rounded-none" />
                <Skeleton className="h-8 w-32 rounded-none" />
              </div>
            ) : scheduleError ? (
              <div>
                <StatusMessage type="error" message={scheduleError} />
                <Button variant="outline" className="mt-3 rounded-none shadow-none font-sans" onClick={loadScheduleData}>
                  <FiRefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            ) : schedule ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Status</p>
                    <Badge
                      variant={schedule.is_active ? 'default' : 'secondary'}
                      className="rounded-none font-sans text-xs"
                    >
                      {schedule.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Frequency</p>
                    <p className="text-sm font-sans font-medium">
                      {schedule.cron_expression ? cronToHuman(schedule.cron_expression) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Timezone</p>
                    <p className="text-sm font-sans font-medium">{schedule.timezone ?? 'Asia/Kolkata'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Next Run</p>
                    <p className="text-sm font-sans font-medium">
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
                    className="rounded-none shadow-none font-sans gap-1.5"
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
                    className="rounded-none shadow-none font-sans gap-1.5"
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
        <Card className="border rounded-none shadow-none mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
                <FiActivity className="w-4 h-4" />
                Run History
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-none shadow-none font-sans text-xs gap-1"
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
                  <Skeleton key={i} className="h-12 w-full rounded-none" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">
                No execution history yet.
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border border-border bg-background">
                    <div className="flex items-center gap-3">
                      {log.success ? (
                        <FiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <FiAlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
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
        <Card className="border rounded-none shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base tracking-tight">Agent Information</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="space-y-3">
              <AgentInfoRow
                name="Research Digest Coordinator"
                id={MANAGER_AGENT_ID}
                role="Manager"
                active={false}
              />
              <AgentInfoRow
                name="ArXiv Research Agent"
                id={ARXIV_AGENT_ID}
                role="Sub-agent"
                active={false}
              />
              <AgentInfoRow
                name="Email Digest Agent"
                id={EMAIL_AGENT_ID}
                role="Sub-agent"
                active={false}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    }
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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <aside className={cn('bg-card border-r border-border flex flex-col transition-all duration-200 flex-shrink-0', sidebarCollapsed ? 'w-16' : 'w-60')}>
          {/* Logo / Brand */}
          <div className="p-4 border-b border-border">
            {sidebarCollapsed ? (
              <button onClick={() => setSidebarCollapsed(false)} className="w-full flex justify-center py-1">
                <FiBookOpen className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-bold tracking-tight leading-tight">ArXiv</h2>
                  <p className="font-serif text-xs text-muted-foreground tracking-tight">Research Monitor</p>
                </div>
                <button onClick={() => setSidebarCollapsed(true)} className="text-muted-foreground hover:text-foreground p-1">
                  <FiChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-sans transition-colors',
                    sidebarCollapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-secondary text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Sample Data Toggle */}
          <div className={cn('border-t border-border p-4', sidebarCollapsed && 'px-2')}>
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <Switch
                  checked={showSample}
                  onCheckedChange={setShowSample}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Label className="text-xs font-sans text-muted-foreground">Sample Data</Label>
                <Switch
                  checked={showSample}
                  onCheckedChange={setShowSample}
                />
              </div>
            )}
          </div>

          {/* Agent status */}
          {!sidebarCollapsed && (
            <div className="border-t border-border p-4">
              <p className="text-xs font-sans text-muted-foreground uppercase tracking-wide mb-2">Agents</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5 rounded-full', activeAgentId === MANAGER_AGENT_ID ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
                  <span className="text-xs font-sans text-muted-foreground">Coordinator</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5 rounded-full', activeAgentId === ARXIV_AGENT_ID ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
                  <span className="text-xs font-sans text-muted-foreground">ArXiv Agent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5 rounded-full', activeAgentId === EMAIL_AGENT_ID ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
                  <span className="text-xs font-sans text-muted-foreground">Email Agent</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
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
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  )
}
