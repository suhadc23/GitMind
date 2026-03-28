'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/trpc/react'
import { usePRChannel } from '@/hooks/use-pr-channel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  GitPullRequest,
  ArrowLeft,
  Bot,
  MessageSquare,
  Check,
  X,
  Shield,
  Zap,
  Paintbrush,
  Bug,
  Info,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  FileCode,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

export default function PRReviewPage() {
  const { pullRequestId } = useParams<{ pullRequestId: string }>()
  const [commentFilter, setCommentFilter] = useState<'all' | 'ai' | 'human' | 'unresolved'>('all')
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [activeComment, setActiveComment] = useState<{
    fileId: string
    lineNumber: number
  } | null>(null)
  const [commentText, setCommentText] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Real-time updates
  usePRChannel(pullRequestId)

  const { data: pr, isLoading } = api.review.getPullRequest.useQuery(
    { pullRequestId },
    { enabled: !!pullRequestId }
  )

  const addComment = api.review.addComment.useMutation()
  const resolveComment = api.review.resolveComment.useMutation()
  const submitReview = api.review.submitReview.useMutation()
  const triggerAI = api.review.triggerAIReview.useMutation()
  const utils = api.useUtils()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!pr) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <XCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Pull Request Not Found</h2>
        <Link href="/reviews">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reviews
          </Button>
        </Link>
      </div>
    )
  }

  const toggleFile = (fileId: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  const handleAddComment = async (fileId: string, lineNumber: number) => {
    if (!commentText.trim()) return
    try {
      await addComment.mutateAsync({
        pullRequestId,
        prFileId: fileId,
        lineNumber,
        side: 'right',
        body: commentText,
      })
      setCommentText('')
      setActiveComment(null)
      utils.review.getPullRequest.invalidate({ pullRequestId })
    } catch {
      toast.error('Failed to add comment')
    }
  }

  const handleResolve = async (commentId: string, resolved: boolean) => {
    await resolveComment.mutateAsync({ commentId, resolved })
    utils.review.getPullRequest.invalidate({ pullRequestId })
  }

  const handleSubmitReview = async (status: 'APPROVED' | 'CHANGES_REQUESTED') => {
    try {
      await submitReview.mutateAsync({ pullRequestId, status })
      toast.success(status === 'APPROVED' ? 'PR approved!' : 'Changes requested')
      utils.review.getPullRequest.invalidate({ pullRequestId })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit review')
    }
  }

  const handleRerunAI = async () => {
    try {
      await triggerAI.mutateAsync({ pullRequestId })
      toast.success('AI review re-triggered. Results will appear shortly.')
    } catch {
      toast.error('Failed to trigger AI review')
    }
  }

  const filteredComments = pr.comments.filter((c) => {
    if (commentFilter === 'ai') return c.commentType === 'AI'
    if (commentFilter === 'human') return c.commentType === 'HUMAN'
    if (commentFilter === 'unresolved') return !c.resolved
    return true
  })

  const aiComments = pr.comments.filter((c) => c.commentType === 'AI')
  const humanComments = pr.comments.filter((c) => c.commentType === 'HUMAN')
  const unresolvedCount = pr.comments.filter((c) => !c.resolved).length

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/reviews" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" />
          Back to Reviews
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <StatusIcon status={pr.status} />
              {pr.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>#{pr.githubPrNumber}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                {pr.authorAvatarUrl && (
                  <img src={pr.authorAvatarUrl} alt="" className="h-5 w-5 rounded-full" />
                )}
                {pr.authorGithubLogin}
              </span>
              <span>·</span>
              <Badge variant="outline" className="font-mono text-xs">
                {pr.baseBranch} ← {pr.headBranch}
              </Badge>
              <a
                href={pr.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                GitHub
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRerunAI} disabled={triggerAI.isPending}>
              {triggerAI.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1">Re-run AI</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => handleSubmitReview('CHANGES_REQUESTED')}
            >
              <X className="h-4 w-4 mr-1" />
              Request Changes
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleSubmitReview('APPROVED')}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {pr.aiSummary && (
        <Card className="mb-6 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-500" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{pr.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Reviewers */}
      {pr.reviewers.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium">Reviewers:</span>
          {pr.reviewers.map((r) => (
            <TooltipProvider key={r.id}>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-sm">
                    <ReviewStatusDot status={r.status} />
                    {r.user.firstName || r.user.emailAddress}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{r.status}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <Badge variant="secondary">{pr.files.length} files changed</Badge>
        <Badge variant="secondary" className="text-emerald-600">
          <Bot className="h-3 w-3 mr-1" />
          {aiComments.length} AI annotations
        </Badge>
        <Badge variant="secondary">
          <MessageSquare className="h-3 w-3 mr-1" />
          {humanComments.length} comments
        </Badge>
        {unresolvedCount > 0 && (
          <Badge variant="destructive">{unresolvedCount} unresolved</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main diff area */}
        <div className="lg:col-span-3 space-y-4">
          {pr.files.map((file) => {
            const isExpanded = expandedFiles.has(file.id)
            const fileComments = filteredComments.filter((c) => c.prFileId === file.id)

            return (
              <Card key={file.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => toggleFile(file.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{file.fileName}</span>
                    <FileStatusBadge status={file.status} />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {file._count.comments > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {file._count.comments}
                      </span>
                    )}
                    <span className="text-green-600">+{file.additions}</span>
                    <span className="text-red-600">-{file.deletions}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t">
                    {/* Diff content */}
                    <div className="overflow-x-auto">
                      <DiffContent
                        patch={file.patch}
                        fileId={file.id}
                        comments={fileComments}
                        activeComment={activeComment}
                        setActiveComment={setActiveComment}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        onAddComment={handleAddComment}
                        onResolve={handleResolve}
                        isSubmitting={addComment.isPending}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Right sidebar — comments panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Comments</CardTitle>
              <div className="flex gap-1 mt-2">
                {(['all', 'ai', 'human', 'unresolved'] as const).map((filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={commentFilter === filter ? 'default' : 'ghost'}
                    className="text-xs h-7 px-2"
                    onClick={() => setCommentFilter(filter)}
                  >
                    {filter === 'all' && 'All'}
                    {filter === 'ai' && '🤖 AI'}
                    {filter === 'human' && '💬'}
                    {filter === 'unresolved' && '⚠️'}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              {filteredComments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {filteredComments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg border text-sm ${
                        comment.resolved ? 'opacity-50' : ''
                      } ${comment.commentType === 'AI' ? 'border-l-2' : ''}`}
                      style={{
                        borderLeftColor:
                          comment.commentType === 'AI'
                            ? getCategoryColor(comment.aiCategory)
                            : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {comment.commentType === 'AI' ? (
                          <>
                            <Bot className="h-3 w-3 text-emerald-500" />
                            <CategoryBadge category={comment.aiCategory} />
                            {comment.severity && <SeverityDots severity={comment.severity} />}
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            <span className="font-medium text-xs">
                              {comment.user?.firstName || 'User'}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{comment.body}</p>
                      {comment.lineNumber && (
                        <p className="text-xs text-muted-foreground mt-1">Line {comment.lineNumber}</p>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs mt-1 px-1"
                        onClick={() => handleResolve(comment.id, !comment.resolved)}
                      >
                        {comment.resolved ? 'Unresolve' : 'Resolve'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// === Sub-components ===

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className="h-6 w-6 text-green-500" />
    case 'CHANGES_REQUESTED':
      return <XCircle className="h-6 w-6 text-red-500" />
    default:
      return <Clock className="h-6 w-6 text-yellow-500" />
  }
}

function ReviewStatusDot({ status }: { status: string }) {
  const color = status === 'APPROVED' ? 'bg-green-500' : status === 'CHANGES_REQUESTED' ? 'bg-red-500' : 'bg-yellow-500'
  return <div className={`h-2 w-2 rounded-full ${color}`} />
}

function FileStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'added':
      return <Badge className="bg-green-100 text-green-700 text-xs h-5">added</Badge>
    case 'removed':
      return <Badge className="bg-red-100 text-red-700 text-xs h-5">removed</Badge>
    case 'renamed':
      return <Badge className="bg-blue-100 text-blue-700 text-xs h-5">renamed</Badge>
    default:
      return <Badge className="bg-yellow-100 text-yellow-700 text-xs h-5">modified</Badge>
  }
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    SECURITY: { icon: <Shield className="h-3 w-3" />, color: 'text-red-600' },
    PERFORMANCE: { icon: <Zap className="h-3 w-3" />, color: 'text-orange-600' },
    STYLE: { icon: <Paintbrush className="h-3 w-3" />, color: 'text-blue-600' },
    BUG: { icon: <Bug className="h-3 w-3" />, color: 'text-red-500' },
    GENERAL: { icon: <Info className="h-3 w-3" />, color: 'text-gray-600' },
  }
  const c = config[category] || config.GENERAL!
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${c.color}`}>
      {c.icon}
      {category}
    </span>
  )
}

function SeverityDots({ severity }: { severity: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < severity ? 'bg-red-500' : 'bg-gray-300'}`}
        />
      ))}
    </div>
  )
}

function getCategoryColor(category: string | null): string {
  switch (category) {
    case 'SECURITY': return '#dc2626'
    case 'BUG': return '#ef4444'
    case 'PERFORMANCE': return '#f97316'
    case 'STYLE': return '#3b82f6'
    default: return '#6b7280'
  }
}

// Diff content renderer
function DiffContent({
  patch,
  fileId,
  comments,
  activeComment,
  setActiveComment,
  commentText,
  setCommentText,
  onAddComment,
  onResolve,
  isSubmitting,
}: {
  patch: string | null
  fileId: string
  comments: any[]
  activeComment: { fileId: string; lineNumber: number } | null
  setActiveComment: (v: { fileId: string; lineNumber: number } | null) => void
  commentText: string
  setCommentText: (v: string) => void
  onAddComment: (fileId: string, lineNumber: number) => void
  onResolve: (commentId: string, resolved: boolean) => void
  isSubmitting: boolean
}) {
  if (!patch) {
    return <div className="p-4 text-sm text-muted-foreground">No diff available (binary file or too large)</div>
  }

  const lines = patch.split('\n')
  let newLineNum = 0
  let oldLineNum = 0

  return (
    <div className="font-mono text-xs">
      {lines.map((line, idx) => {
        // Parse hunk header
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
          if (match) {
            oldLineNum = parseInt(match[1]!) - 1
            newLineNum = parseInt(match[2]!) - 1
          }
          return (
            <div key={idx} className="bg-blue-50 dark:bg-blue-950 text-blue-600 px-4 py-1 border-y">
              {line}
            </div>
          )
        }

        let bgClass = ''
        let currentNewLine = 0
        let currentOldLine = 0

        if (line.startsWith('+')) {
          newLineNum++
          currentNewLine = newLineNum
          bgClass = 'bg-green-50 dark:bg-green-950/30'
        } else if (line.startsWith('-')) {
          oldLineNum++
          currentOldLine = oldLineNum
          bgClass = 'bg-red-50 dark:bg-red-950/30'
        } else {
          oldLineNum++
          newLineNum++
          currentOldLine = oldLineNum
          currentNewLine = newLineNum
        }

        const lineNum = currentNewLine || currentOldLine
        const lineComments = comments.filter((c) => c.lineNumber === lineNum)
        const isActiveComment = activeComment?.fileId === fileId && activeComment?.lineNumber === lineNum

        return (
          <div key={idx}>
            <div className={`flex group ${bgClass} hover:bg-blue-50/50 dark:hover:bg-blue-950/20`}>
              {/* Line numbers */}
              <div className="w-12 text-right pr-2 text-muted-foreground/50 select-none border-r shrink-0">
                {currentOldLine || ''}
              </div>
              <div className="w-12 text-right pr-2 text-muted-foreground/50 select-none border-r shrink-0">
                {currentNewLine || ''}
              </div>

              {/* Add comment button */}
              <div
                className="w-6 flex items-center justify-center shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setActiveComment({ fileId, lineNumber: lineNum })}
              >
                <Plus className="h-3 w-3 text-blue-500" />
              </div>

              {/* Code */}
              <div className="flex-1 px-2 whitespace-pre overflow-x-auto">
                {line.startsWith('+') ? line.substring(1) : line.startsWith('-') ? line.substring(1) : line.startsWith(' ') ? line.substring(1) : line}
              </div>

              {/* Comment indicator */}
              {lineComments.length > 0 && (
                <div className="w-6 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-3 w-3 text-emerald-500" />
                </div>
              )}
            </div>

            {/* Inline comments */}
            {lineComments.map((comment) => (
              <div
                key={comment.id}
                className={`mx-12 my-1 p-3 rounded border text-sm ${
                  comment.resolved ? 'opacity-50' : ''
                }`}
                style={{
                  borderLeftWidth: comment.commentType === 'AI' ? 3 : 1,
                  borderLeftColor: comment.commentType === 'AI' ? getCategoryColor(comment.aiCategory) : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {comment.commentType === 'AI' ? (
                    <>
                      <Bot className="h-3 w-3 text-emerald-500" />
                      <CategoryBadge category={comment.aiCategory} />
                      {comment.severity && <SeverityDots severity={comment.severity} />}
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      <span className="font-medium text-xs">{comment.user?.firstName || 'User'}</span>
                    </>
                  )}
                  <button
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onResolve(comment.id, !comment.resolved)}
                  >
                    {comment.resolved ? '↩ Unresolve' : '✓ Resolve'}
                  </button>
                </div>
                <p className="text-sm">{comment.body}</p>
              </div>
            ))}

            {/* Inline comment form */}
            {isActiveComment && (
              <div className="mx-12 my-2 p-3 rounded border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a review comment..."
                  className="min-h-[60px] text-sm mb-2"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setActiveComment(null); setCommentText('') }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onAddComment(fileId, lineNum)}
                    disabled={!commentText.trim() || isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Comment
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
