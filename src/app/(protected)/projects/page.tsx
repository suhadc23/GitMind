'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Github,
  Star,
  GitFork,
  Code2,
  ExternalLink,
  Loader2,
  Calendar,
  MessageSquare
} from 'lucide-react'

interface RepoInfo {
  description: string | null
  language: string | null
  stars: number
  forks: number
  owner: string
  avatar: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  githubUrl: string
  createdAt: string
  repoInfo: RepoInfo | null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch projects')
        }

        setProjects(data.projects)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">
              Manage all your connected GitHub repositories
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            Manage all your connected GitHub repositories
          </p>
        </div>
        <Link href="/create">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Projects List or Empty State */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full mb-6">
              <Github className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              No projects yet
            </h3>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto">
              Get started by connecting your first GitHub repository. Once connected, you will be able to ask questions and get AI-powered insights about your code.
            </p>
            <Link href="/create">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Project
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        {project.repoInfo?.avatar ? (
          <img
            src={project.repoInfo.avatar}
            alt={project.repoInfo.owner}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
            <Github className="h-6 w-6 text-emerald-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate text-lg">
              {project.name}
            </h3>
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          {project.repoInfo?.owner && (
            <p className="text-sm text-gray-500">
              by {project.repoInfo.owner}
            </p>
          )}
        </div>
      </div>

      {project.repoInfo?.description && (
        <p className="text-sm text-gray-600 mt-4 line-clamp-2">
          {project.repoInfo.description}
        </p>
      )}

      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {project.repoInfo?.language && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Code2 className="h-4 w-4" />
            {project.repoInfo.language}
          </span>
        )}
        {project.repoInfo && (
          <>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Star className="h-4 w-4" />
              {project.repoInfo.stars.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <GitFork className="h-4 w-4" />
              {project.repoInfo.forks.toLocaleString()}
            </span>
          </>
        )}
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          {formatDate(project.createdAt)}
        </span>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
        <Link href={`/project/${project.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask Questions
          </Button>
        </Link>
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="secondary" className="w-full">
            <Github className="mr-2 h-4 w-4" />
            View Repo
          </Button>
        </a>
      </div>
    </div>
  )
}
