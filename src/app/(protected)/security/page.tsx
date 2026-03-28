'use client'

import { AlertTriangle, RefreshCw, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react'
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium'

type Finding = {
  fileName: string
  severity: Severity
  category: string
  description: string
  snippet: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'Secure', bg: 'bg-emerald-500' }
  if (score >= 60) return { text: 'Moderate Risk', bg: 'bg-amber-500' }
  return { text: 'High Risk', bg: 'bg-red-500' }
}

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  high:     { label: 'High',     bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  medium:   { label: 'Medium',   bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEVERITY_CONFIG[severity]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-56 bg-gray-100 rounded-xl" />
      <div className="h-40 bg-gray-100 rounded-xl" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const { projects, projectId, setProjectId } = useProject()

  const { data: report, refetch } = api.project.getSecurityReport.useQuery(
    { projectId },
    { enabled: !!projectId },
  )

  const runScan = api.project.runSecurityScan.useMutation({
    onSuccess: () => {
      toast.success('Security scan complete!')
      void refetch()
    },
    onError: (err) => {
      toast.error(err.message)
      void refetch()
    },
  })

  const findings = (report?.topFindings as Finding[] | null) ?? []
  const label = report?.status === 'COMPLETED' ? scoreLabel(report.overallScore) : null
  const isRunning = runScan.isPending || report?.status === 'PROCESSING'

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Scan</h1>
            <p className="text-sm text-gray-500">
              Static analysis for vulnerabilities across your indexed codebase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {projects && projects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">Scanning:</span>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-48 border-gray-200 bg-white font-medium text-sm focus:ring-red-400">
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
              onClick={() => runScan.mutate({ projectId })}
              disabled={isRunning}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Scanning…' : report ? 'Re-scan' : 'Run Scan'}
            </Button>
          )}
        </div>
      </div>

      {/* ── No project ── */}
      {!projectId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <ShieldAlert className="h-12 w-12 text-gray-200" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">No project selected</p>
              <p className="text-sm text-gray-500 mt-1">
                Use the <span className="font-medium text-gray-700">"Scanning"</span> dropdown above to pick a project
              </p>
            </div>
          </CardContent>
        </Card>

      /* ── Scanning ── */
      ) : isRunning ? (
        <LoadingSkeleton />

      /* ── No report yet ── */
      ) : !report ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <ShieldCheck className="h-12 w-12 text-gray-200" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">No scan run yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Click "Run Scan" to check your indexed files for security vulnerabilities
              </p>
            </div>
            <Button
              onClick={() => runScan.mutate({ projectId })}
              disabled={runScan.isPending}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              Run First Scan
            </Button>
          </CardContent>
        </Card>

      /* ── Failed ── */
      ) : report.status === 'FAILED' ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <AlertTriangle className="h-12 w-12 text-red-400" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">Scan failed</p>
              <p className="text-sm text-gray-500 mt-1">
                Make sure the project has indexed files, then try again.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => runScan.mutate({ projectId })}
              disabled={runScan.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>

      /* ── Full dashboard ── */
      ) : (
        <div className="space-y-5">

          {/* Score ring + severity counters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">

                {/* Ring */}
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
                  <p className="text-sm text-gray-500">Security Score</p>
                  {label && (
                    <Badge className={`${label.bg} text-white border-0`}>
                      {label.text}
                    </Badge>
                  )}
                </div>

                {/* Severity counts */}
                <div className="flex-1 w-full space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Findings by Severity
                  </p>

                  {[
                    { severity: 'critical' as Severity, count: report.criticalCount, deduction: '−20 pts each' },
                    { severity: 'high'     as Severity, count: report.highCount,     deduction: '−8 pts each' },
                    { severity: 'medium'   as Severity, count: report.mediumCount,   deduction: '−3 pts each' },
                  ].map(({ severity, count, deduction }) => {
                    const c = SEVERITY_CONFIG[severity]
                    return (
                      <div key={severity} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-gray-600 shrink-0 capitalize">{severity}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              severity === 'critical' ? 'bg-red-500' :
                              severity === 'high'     ? 'bg-orange-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, count * 10)}%` }}
                          />
                        </div>
                        <span className={`w-6 text-sm font-bold text-right tabular-nums ${c.text}`}>
                          {count}
                        </span>
                        <span className="w-24 text-xs text-gray-400 text-right">{deduction}</span>
                      </div>
                    )
                  })}

                  <div className="pt-2 flex gap-6 text-sm text-gray-500">
                    <span><span className="font-semibold text-gray-800">{report.totalIssues}</span> total issues</span>
                    <span><span className="font-semibold text-gray-800">{report.totalFilesScanned}</span> files scanned</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Findings table */}
          {findings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  Security Findings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-gray-50">
                  {findings.map((f, i) => (
                    <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={f.severity} />
                        <span className="text-xs font-semibold text-gray-700">{f.category}</span>
                        <span className="text-xs text-gray-400 truncate max-w-xs">{f.fileName}</span>
                      </div>
                      <p className="text-sm text-gray-600">{f.description}</p>
                      {f.snippet && (
                        <pre className="text-xs bg-gray-900 text-gray-300 rounded px-3 py-2 overflow-x-auto">
                          {f.snippet}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No issues state */}
          {findings.length === 0 && report.status === 'COMPLETED' && (
            <Card className="border-emerald-100 bg-emerald-50/30">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                <ShieldCheck className="h-12 w-12 text-emerald-400" />
                <p className="font-semibold text-emerald-800">No issues detected</p>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  Static analysis found no common vulnerability patterns in your indexed source files.
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {report.aiInsights && (
            <Card className="border-rose-100 bg-gradient-to-br from-rose-50/50 to-red-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-rose-800">
                  <Sparkles className="h-4 w-4" />
                  AI Security Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 leading-relaxed">{report.aiInsights}</p>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center pb-2">
            Last scanned{' '}
            {formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true })}
            {' · '}
            {report.totalFilesScanned} files scanned
          </p>
        </div>
      )}
    </div>
  )
}
