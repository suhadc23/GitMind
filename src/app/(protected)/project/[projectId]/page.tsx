'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Github,
  Star,
  GitFork,
  Code2,
  ExternalLink,
  Send,
  Loader2,
  Sparkles,
  User,
  Bot,
  Coins,
  MessageSquare
} from 'lucide-react'

interface RepoInfo {
  description: string | null
  language: string | null
  stars: number
  forks: number
  owner: string
  avatar: string
}

interface Project {
  id: string
  name: string
  githubUrl: string
  createdAt: string
  repoInfo: RepoInfo | null
}

interface Question {
  id: string
  question: string
  answer: string
  createdAt: string
}

interface QueryResponse {
  success: boolean
  question: string
  answer: string
  creditsRemaining: number
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<number | null>(null)

  // Fetch project details
  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch('/api/projects')
        const data = await response.json()

        if (!response.ok) throw new Error(data.error)

        const found = data.projects.find((p: Project) => p.id === projectId)
        if (found) {
          setProject(found)
        } else {
          setError('Project not found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project')
      }
    }

    async function fetchQuestions() {
      try {
        const response = await fetch(`/api/projects/${projectId}/query`)
        const data = await response.json()

        if (response.ok) {
          setQuestions(data.questions || [])
        }
      } catch {
        // Ignore errors for question history
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
    fetchQuestions()
  }, [projectId])

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isAsking) return

    setIsAsking(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      const data: QueryResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer')
      }

      // Add new Q&A to the list
      setQuestions((prev) => [
        {
          id: Date.now().toString(),
          question: data.question,
          answer: data.answer,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])

      setCredits(data.creditsRemaining)
      setQuestion('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsAsking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="space-y-6">
        <Link href="/projects">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {project?.repoInfo?.avatar ? (
              <img
                src={project.repoInfo.avatar}
                alt={project.repoInfo.owner}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
                <Github className="h-5 w-5 text-emerald-600" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
              {project?.repoInfo?.owner && (
                <p className="text-sm text-gray-500">by {project.repoInfo.owner}</p>
              )}
            </div>
          </div>
        </div>
        <a
          href={project?.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline">
            <Github className="mr-2 h-4 w-4" />
            View on GitHub
          </Button>
        </a>
      </div>

      {/* Project Info Card */}
      {project?.repoInfo && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {project.repoInfo.description && (
            <p className="text-gray-600 mb-4">{project.repoInfo.description}</p>
          )}
          <div className="flex items-center gap-6 flex-wrap">
            {project.repoInfo.language && (
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Code2 className="h-4 w-4" />
                {project.repoInfo.language}
              </span>
            )}
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="h-4 w-4" />
              {project.repoInfo.stars.toLocaleString()} stars
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <GitFork className="h-4 w-4" />
              {project.repoInfo.forks.toLocaleString()} forks
            </span>
            {credits !== null && (
              <span className="flex items-center gap-2 text-sm text-emerald-600 ml-auto">
                <Coins className="h-4 w-4" />
                {credits} credits remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* AI Query Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="h-6 w-6" />
            <div>
              <h2 className="font-semibold text-lg">Ask AI About This Repository</h2>
              <p className="text-emerald-50 text-sm">
                Get instant answers powered by Google Gemini AI
              </p>
            </div>
          </div>
        </div>

        {/* Question Input */}
        <div className="p-4 border-b border-gray-100">
          <form onSubmit={handleAskQuestion} className="flex gap-3">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this repository..."
              disabled={isAsking}
              className="flex-1 h-12"
            />
            <Button type="submit" disabled={isAsking || !question.trim()} className="h-12 px-6">
              {isAsking ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Ask
                </>
              )}
            </Button>
          </form>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Q&A History */}
        <div className="max-h-[500px] overflow-y-auto">
          {questions.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No questions yet. Ask something about this repository!</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                  'What does this project do?',
                  'How do I get started?',
                  'What technologies does it use?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuestion(suggestion)}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {questions.map((q) => (
                <div key={q.id} className="p-4">
                  {/* Question */}
                  <div className="flex gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{q.question}</p>
                    </div>
                  </div>
                  {/* Answer */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p className="whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
