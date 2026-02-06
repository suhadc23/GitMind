'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Github,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
  GitFork,
  Code2,
  ExternalLink
} from 'lucide-react'

interface RepoInfo {
  description: string | null
  language: string | null
  stars: number
  forks: number
  owner: string
  avatar: string
}

interface ProjectResponse {
  success: boolean
  project: {
    id: string
    name: string
    githubUrl: string
    repoInfo: RepoInfo
  }
}

export default function CreateProjectPage() {
  const router = useRouter()
  const [githubUrl, setGithubUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<ProjectResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      setSuccess(data)

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/projects')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600 mt-1">
            Connect a GitHub repository to start asking questions
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl">
            <Github className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Link GitHub Repository
            </h2>
            <p className="text-gray-500 text-sm">
              Enter the URL of a public GitHub repository
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="githubUrl" className="text-sm font-medium text-gray-700">
              Repository URL
            </label>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/username/repository"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={isLoading || !!success}
              className="h-12 text-base"
              required
            />
            <p className="text-xs text-gray-500">
              Example: https://github.com/facebook/react
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700">
                  Project created successfully! Redirecting...
                </p>
              </div>

              {/* Repo Info Card */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="flex items-start gap-4">
                  <img
                    src={success.project.repoInfo.avatar}
                    alt={success.project.repoInfo.owner}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {success.project.name}
                      </h3>
                      <a
                        href={success.project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      by {success.project.repoInfo.owner}
                    </p>
                    {success.project.repoInfo.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {success.project.repoInfo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      {success.project.repoInfo.language && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Code2 className="h-3.5 w-3.5" />
                          {success.project.repoInfo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="h-3.5 w-3.5" />
                        {success.project.repoInfo.stars.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <GitFork className="h-3.5 w-3.5" />
                        {success.project.repoInfo.forks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {!success && (
            <Button
              type="submit"
              size="lg"
              className="w-full h-12"
              disabled={isLoading || !githubUrl}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting Repository...
                </>
              ) : (
                <>
                  <Github className="mr-2 h-5 w-5" />
                  Connect Repository
                </>
              )}
            </Button>
          )}
        </form>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
        <h3 className="font-semibold text-gray-900 mb-2">
          What happens next?
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>We will fetch the repository information from GitHub</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>The project will be added to your dashboard</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>You can then ask AI-powered questions about the code</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
