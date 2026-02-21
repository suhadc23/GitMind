'use client'

import { ExternalLink, GitCommitHorizontal } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/trpc/react'
import { useProject } from '@/hooks/use-project'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function CommitLog() {
  const { project } = useProject()
  const { data: commits } = api.project.getCommits.useQuery(
    { projectId: project?.id ?? '' },
    { enabled: !!project?.id }
  )

  if (!project) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Select a project to view commits
      </div>
    )
  }

  if (!commits || commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground text-sm">
        <GitCommitHorizontal className="h-8 w-8 opacity-30" />
        <p>No commits synced yet</p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {commits.map((commit, idx) => (
        <li key={commit.id} className="relative flex gap-x-4">
          <div
            className={`absolute left-0 top-0 flex w-6 justify-center ${
              idx === commits.length - 1 ? 'h-6' : '-bottom-6'
            }`}
          >
            <div className="w-px translate-x-3 bg-gray-200" />
          </div>

          <Avatar className="relative mt-3 h-6 w-6 flex-none rounded-full bg-gray-50">
            <AvatarImage src={commit.commitAuthorAvatar} alt={commit.commitAuthorName} />
            <AvatarFallback className="text-xs">
              {commit.commitAuthorName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-auto rounded-md bg-white p-3 ring-1 ring-inset ring-gray-200">
            <div className="flex justify-between gap-x-4">
              <Link
                href={`${project.githubUrl}/commit/${commit.commitHash}`}
                target="_blank"
                className="flex items-center gap-1 py-0.5 text-xs leading-5 text-gray-500 hover:text-gray-700"
              >
                <span className="font-medium text-gray-900">{commit.commitAuthorName}</span>
                &nbsp;committed
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
              <time className="flex-none py-0.5 text-xs leading-5 text-gray-500">
                {new Date(commit.commitDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-1">{commit.commitMessage}</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{commit.summary}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
