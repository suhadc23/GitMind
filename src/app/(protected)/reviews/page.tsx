'use client'

import { useState } from 'react'
import { useProject } from '@/hooks/use-project'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GitPullRequest, Plus, MessageSquare, Users, Loader2, ExternalLink, FolderKanban } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ReviewsPage() {
  const { projectId, projects, setProjectId } = useProject()
  const [importOpen, setImportOpen] = useState(false)

  const { data: pullRequests, isLoading } = api.review.getPullRequests.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  )

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <GitPullRequest className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Select a Project</h2>
        <p className="text-muted-foreground">Choose a project to start reviewing pull requests.</p>
        {projects && projects.length > 0 ? (
          <Select onValueChange={(val) => setProjectId(val)}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">No projects yet.</p>
            <Link href="/create">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Create Your First Project</Button>
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GitPullRequest className="h-8 w-8 text-emerald-500" />
            Code Reviews
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered collaborative pull request reviews</p>
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Import PR
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Pull Request</DialogTitle>
              <DialogDescription>Select an open PR from GitHub to import and review with AI.</DialogDescription>
            </DialogHeader>
            <ImportPRContent projectId={projectId} onImported={() => setImportOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !pullRequests?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <GitPullRequest className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Pull Requests Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Import a pull request from GitHub to start reviewing with AI-powered annotations.
            </p>
            <Button onClick={() => setImportOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Import Your First PR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pullRequests.map((pr) => (
            <Link key={pr.id} href={`/reviews/${pr.id}`}>
              <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <StatusBadge status={pr.status} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{pr.title}</CardTitle>
                        <CardDescription className="mt-1">
                          #{pr.githubPrNumber} · {pr.authorGithubLogin} · {pr.baseBranch} ← {pr.headBranch}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {pr._count.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {pr._count.reviewers}
                      </span>
                      <Badge variant="outline">{pr._count.files} files</Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>
    case 'CHANGES_REQUESTED':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Changes Requested</Badge>
    default:
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>
  }
}

function ImportPRContent({ projectId, onImported }: { projectId: string; onImported: () => void }) {
  const fetchPRs = api.review.fetchPRList.useMutation()
  const importPR = api.review.importPullRequest.useMutation()
  const utils = api.useUtils()

  const [prs, setPRs] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  const handleFetch = async () => {
    try {
      const result = await fetchPRs.mutateAsync({ projectId })
      setPRs(result)
      setLoaded(true)
    } catch (error) {
      toast.error('Failed to fetch PRs from GitHub')
    }
  }

  const handleImport = async (prNumber: number) => {
    try {
      await importPR.mutateAsync({ projectId, prNumber })
      utils.review.getPullRequests.invalidate({ projectId })
      toast.success('PR imported! AI review is running in the background.')
      onImported()
    } catch (error: any) {
      toast.error(error.message || 'Failed to import PR')
    }
  }

  if (!loaded) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Button onClick={handleFetch} disabled={fetchPRs.isPending}>
          {fetchPRs.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Fetch Open PRs from GitHub
        </Button>
      </div>
    )
  }

  if (prs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No open pull requests found on this repository.
      </div>
    )
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-2">
      {prs.map((pr: any) => (
        <div
          key={pr.number}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">#{pr.number} {pr.title}</p>
            <p className="text-sm text-muted-foreground">
              {pr.authorLogin} · {pr.baseBranch} ← {pr.headBranch}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => handleImport(pr.number)}
            disabled={importPR.isPending}
            className="ml-4 bg-emerald-600 hover:bg-emerald-700"
          >
            {importPR.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
          </Button>
        </div>
      ))}
    </div>
  )
}
