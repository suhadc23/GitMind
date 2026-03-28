'use client'

import { Activity, AlertTriangle, FileCode, RefreshCw, Sparkles } from 'lucide-react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import 'react-circular-progressbar/dist/styles.css'

import { api } from '@/trpc/react'
import { useProject } from '@/hooks/use-project'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ───────────────────────────────────────────────────────────────────

type FileDetail = {
  fileName: string
  score: number
  lines: number
  issues: string[]
  todoCount: number
  fixmeCount: number
  consoleLogCount: number
  isLargeFile: boolean
  hasErrorHandling: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981' // emerald-500
  if (score >= 60) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
}

function scoreLabel(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'Excellent', bg: 'bg-emerald-500' }
  if (score >= 60) return { text: 'Fair', bg: 'bg-amber-500' }
  return { text: 'Needs Work', bg: 'bg-red-500' }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CategoryBar({
  label,
  score,
  weight,
}: {
  label: string
  score: number
  weight: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
        />
      </div>
      <span
        className="w-8 text-sm font-bold text-right tabular-nums"
        style={{ color: scoreColor(score) }}
      >
        {score}
      </span>
      <span className="w-8 text-xs text-gray-400 text-right">{weight}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-56 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-40 bg-gray-100 rounded-xl" />
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HealthPage() {
  const { projects, projectId, setProjectId } = useProject()

  const { data: report, refetch } = api.project.getHealthReport.useQuery(
    { projectId },
    { enabled: !!projectId },
  )

  const runAnalysis = api.project.runHealthAnalysis.useMutation({
    onSuccess: () => {
      toast.success('Analysis complete!')
      void refetch()
    },
    onError: (err) => {
      toast.error(err.message)
      void refetch()
    },
  })

  const fileDetails = (report?.fileDetails as FileDetail[] | null) ?? []
  const worstFiles = fileDetails.slice(0, 6)
  const label = report?.status === 'COMPLETED' ? scoreLabel(report.overallScore) : null

  const isRunning = runAnalysis.isPending || report?.status === 'PROCESSING'

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Code Health</h1>
            <p className="text-sm text-gray-500">
              AI-powered quality analysis using your indexed codebase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Project selector — always visible so user always knows which project */}
          {projects && projects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">Analyzing:</span>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-48 border-gray-200 bg-white font-medium text-sm focus:ring-emerald-400">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {projectId && (
            <Button
              onClick={() => runAnalysis.mutate({ projectId })}
              disabled={isRunning}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Analyzing…' : report ? 'Re-analyze' : 'Run Analysis'}
            </Button>
          )}
        </div>
      </div>

      {/* ── No project selected ── */}
      {!projectId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <Activity className="h-12 w-12 text-gray-200" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">No project selected</p>
              <p className="text-sm text-gray-500 mt-1">
                Use the <span className="font-medium text-gray-700">&quot;Analyzing&quot;</span> dropdown above to pick a project
              </p>
            </div>
          </CardContent>
        </Card>

      /* ── Analysing ── */
      ) : isRunning ? (
        <LoadingSkeleton />

      /* ── No report yet ── */
      ) : !report ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <Sparkles className="h-12 w-12 text-gray-200" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">No analysis run yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Click &quot;Run Analysis&quot; to scan your indexed files and get a health score
              </p>
            </div>
            <Button
              onClick={() => runAnalysis.mutate({ projectId })}
              disabled={runAnalysis.isPending}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              <Activity className="h-4 w-4 mr-2" />
              Run First Analysis
            </Button>
          </CardContent>
        </Card>

      /* ── Failed ── */
      ) : report.status === 'FAILED' ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <AlertTriangle className="h-12 w-12 text-red-400" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">Analysis failed</p>
              <p className="text-sm text-gray-500 mt-1">
                Make sure the project has indexed files, then try again.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => runAnalysis.mutate({ projectId })}
              disabled={runAnalysis.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>

      /* ── Full dashboard ── */
      ) : (
        <div className="space-y-5">

          {/* Score ring + category breakdown */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">

                {/* Circular score */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="w-44 h-44">
                    <CircularProgressbar
                      value={report.overallScore}
                      text={`${report.overallScore}`}
                      styles={buildStyles({
                        textSize: '22px',
                        pathColor: scoreColor(report.overallScore),
                        textColor: scoreColor(report.overallScore),
                        trailColor: '#f3f4f6',
                        pathTransitionDuration: 0.8,
                      })}
                    />
                  </div>
                  <p className="text-sm text-gray-500">Overall Score</p>
                  {label && (
                    <Badge className={`${label.bg} text-white border-0`}>
                      {label.text}
                    </Badge>
                  )}
                </div>

                {/* Category bars */}
                <div className="flex-1 w-full space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Score Breakdown
                  </p>
                  <CategoryBar label="Code Cleanliness" score={report.cleanlinessScore} weight="25%" />
                  <CategoryBar label="File Organization" score={report.organizationScore} weight="15%" />
                  <CategoryBar label="Error Handling" score={report.errorHandlingScore} weight="30%" />
                  <CategoryBar label="Code Duplication" score={report.duplicationScore} weight="20%" />
                  <CategoryBar label="Documentation" score={report.documentationScore} weight="10%" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'TODOs', value: report.todoCount, warn: report.todoCount > 5 },
              { label: 'FIXMEs', value: report.fixmeCount, warn: report.fixmeCount > 2 },
              { label: 'console.logs', value: report.consoleLogs, warn: report.consoleLogs > 10 },
              { label: 'Large Files', value: report.largeFileCount, warn: report.largeFileCount > 3 },
              { label: 'Files Scanned', value: report.totalFilesAnalyzed, warn: false },
            ].map((m) => (
              <Card key={m.label} className="text-center">
                <CardContent className="py-4">
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      m.warn ? 'text-amber-500' : 'text-gray-800'
                    }`}
                  >
                    {m.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Worst files table */}
          {worstFiles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCode className="h-4 w-4 text-gray-500" />
                  Files Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-gray-50">
                  {worstFiles.map((file) => (
                    <div
                      key={file.fileName}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      {/* Score badge */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: scoreColor(file.score) }}
                      >
                        {file.score}
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {file.fileName}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {file.issues.map((issue) => (
                            <span
                              key={issue}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 shrink-0 tabular-nums">
                        {file.lines} lines
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {report.aiInsights && (
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-emerald-800">
                  <Sparkles className="h-4 w-4" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 leading-relaxed">{report.aiInsights}</p>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center pb-2">
            Last analyzed{' '}
            {formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true })}
            {' · '}
            {report.totalFilesAnalyzed} files scanned
          </p>
        </div>
      )}
    </div>
  )
}
