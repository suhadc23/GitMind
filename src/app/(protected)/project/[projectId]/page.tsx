'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDropzone } from 'react-dropzone'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import axios from 'axios'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Github,
  Star,
  GitFork,
  Code2,
  Send,
  Loader2,
  Sparkles,
  User,
  Bot,
  Coins,
  MessageSquare,
  Database,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Presentation,
  Upload,
  Clock,
  Trash2,
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
  error?: string
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
  const [isIndexed, setIsIndexed] = useState<boolean>(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexingError, setIndexingError] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  // Meetings state
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [convertProgress, setConvertProgress] = useState(0)

  const uploadMeetingMutation = api.project.uploadMeeting.useMutation()
  const { data: meetings, refetch: refetchMeetings } = api.project.getMeetings.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      // Auto-poll every 10s while any meeting is still processing
      refetchInterval: (query) =>
        query.state.data?.some((m) => m.status === 'PROCESSING') ? 10000 : false,
    }
  )
  const deleteMeetingMutation = api.project.deleteMeeting.useMutation()

  const isVideoFile = (file: File) =>
    file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name)

  const convertVideoToAudio = async (file: File): Promise<File> => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util')

    const ffmpeg = new FFmpeg()
    ffmpeg.on('progress', ({ progress }) => {
      setConvertProgress(Math.round(progress * 100))
    })

    // Load ffmpeg core from CDN (required for SharedArrayBuffer)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'))
    const outputName = 'output.mp3'

    await ffmpeg.writeFile(inputName, await fetchFile(file))
    // Extract audio only, 128kbps MP3
    await ffmpeg.exec(['-i', inputName, '-vn', '-ar', '44100', '-ac', '2', '-b:a', '128k', outputName])

    const data = await ffmpeg.readFile(outputName)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioBlob = new Blob([data as any], { type: 'audio/mpeg' })
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    return new File([audioBlob], `${baseName}.mp3`, { type: 'audio/mpeg' })
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      let file = acceptedFiles[0]
      if (!file) return

      const MAX_SIZE = 200 * 1024 * 1024 // 200MB
      if (file.size > MAX_SIZE) {
        toast.error('File too large. Maximum size is 200MB. For best results, export as MP3/M4A audio.')
        return
      }

      setUploadSuccess(false)

      // Convert video to audio first
      if (isVideoFile(file)) {
        try {
          setIsConverting(true)
          setConvertProgress(0)
          toast.info('Converting video to audio...')
          file = await convertVideoToAudio(file)
          toast.success('Video converted to audio!')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          toast.error(`Video conversion failed: ${msg}`)
          return
        } finally {
          setIsConverting(false)
          setConvertProgress(0)
        }
      }

      if (file.size > 100 * 1024 * 1024) {
        toast.info('Large file detected. Upload may take several minutes.')
      }

      setIsUploading(true)
      setUploadProgress(0)

      try {
        // Upload via server-side proxy (raw binary) to avoid CORS + FormData parser limits
        const downloadUrl = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', '/api/upload-file')
          // Send raw binary — server reads arrayBuffer(), no FormData parsing
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.setRequestHeader('x-filename', encodeURIComponent(file.name))

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100))
            }
          }

          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText)
              if (xhr.status === 200) resolve(data.url)
              else reject(new Error(data.error || 'Upload failed'))
            } catch {
              reject(new Error('Invalid server response'))
            }
          }

          xhr.onerror = () => reject(new Error('Network error during upload'))
          xhr.send(file) // send raw File object, not FormData
        })

        const meeting = await uploadMeetingMutation.mutateAsync({
          meetingUrl: downloadUrl,
          projectId,
          name: file.name,
        })
        await axios.post('/api/process-meeting', {
          meetingId: meeting.id,
          meetingUrl: downloadUrl,
        })
        setUploadSuccess(true)
        toast.success('Meeting uploaded! Processing will complete shortly.')
        await refetchMeetings()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Upload failed: ${msg}`)
        setUploadSuccess(false)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [projectId, uploadMeetingMutation, refetchMeetings]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'], 'video/*': ['.mp4', '.webm', '.mov'] },
    multiple: false,
    disabled: isUploading || isConverting,
  })

  const handleDeleteMeeting = (meetingId: string) => {
    deleteMeetingMutation.mutate(
      { meetingId },
      {
        onSuccess: async () => {
          toast.success('Meeting deleted')
          await refetchMeetings()
        },
        onError: () => toast.error('Failed to delete meeting'),
      }
    )
  }

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

    async function checkIndexStatus() {
      try {
        const response = await fetch(`/api/projects/${projectId}/index`)
        const data = await response.json()

        if (response.ok) {
          setIsIndexed(data.indexed)
        }
      } catch {
        // Ignore errors for index status
      }
    }

    fetchProject()
    fetchQuestions()
    checkIndexStatus()
  }, [projectId])

  const handleIndexRepo = async () => {
    if (isIndexing) return

    setIsIndexing(true)
    setIndexingError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to index repository')
      }

      setIsIndexed(true)
      alert(`✅ Repository indexed successfully!\n\n📊 Indexed ${data.indexed} files\n💰 Credits used: ${data.creditsUsed}\n💳 Remaining: ${data.remainingCredits} credits`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setIndexingError(errorMessage)
      alert(`❌ Indexing failed:\n\n${errorMessage}`)
    } finally {
      setIsIndexing(false)
    }
  }

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

      // Add new Q&A to the list and auto-open the Sheet
      const newItem: Question = {
        id: Date.now().toString(),
        question: data.question,
        answer: data.answer,
        createdAt: new Date().toISOString(),
      }
      setQuestions((prev) => [newItem, ...prev])
      setSelectedQuestion(newItem)
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

      {/* Repository Indexing Section */}
      <div className={`rounded-xl border-2 p-6 ${
        isIndexed
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {isIndexed ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Database className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold text-lg ${
                isIndexed ? 'text-emerald-900' : 'text-blue-900'
              }`}>
                {isIndexed ? 'Repository Indexed' : 'Index Repository for Better AI Answers'}
              </h3>
              <p className={`text-sm mt-1 ${
                isIndexed ? 'text-emerald-700' : 'text-blue-700'
              }`}>
                {isIndexed
                  ? 'This repository has been indexed. AI can now answer questions using the actual code files.'
                  : 'Index this repository to enable AI to answer questions using the actual code instead of just the README.'
                }
              </p>
              {!isIndexed && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-blue-600">
                    💡 <strong>Benefits:</strong> More accurate answers, code-specific insights, better understanding of implementation details
                  </p>
                  <p className="text-xs text-blue-600">
                    💰 <strong>Cost:</strong> 1 credit per 10 files (max 20 files for demo)
                  </p>
                </div>
              )}
              {indexingError && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{indexingError}</p>
                </div>
              )}
            </div>
          </div>
          {!isIndexed && (
            <Button
              onClick={handleIndexRepo}
              disabled={isIndexing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isIndexing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Indexing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Index Repository
                </>
              )}
            </Button>
          )}
        </div>
      </div>

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
                <button
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{q.question}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Answer Sheet */}
      <Sheet open={!!selectedQuestion} onOpenChange={(open) => { if (!open) setSelectedQuestion(null) }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto overflow-x-hidden">
          <SheetHeader className="text-left">
            <SheetTitle>{selectedQuestion?.question}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="prose max-w-none text-sm text-gray-900 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: (props) => (
                      <pre className="overflow-x-auto bg-gray-900 rounded p-3 my-2 text-gray-100 text-xs whitespace-pre" {...props} />
                    ),
                    code: ({ className, children, ...props }: any) => {
                      const isBlock = !!className?.startsWith('language-')
                      return isBlock ? (
                        <code className={className} {...props}>{children}</code>
                      ) : (
                        <code className="bg-gray-100 text-gray-800 rounded px-1 text-xs" {...props}>{children}</code>
                      )
                    },
                  }}
                >
                  {selectedQuestion?.answer ?? ''}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Meetings Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-400 to-amber-500 p-4">
          <div className="flex items-center gap-3 text-white">
            <Presentation className="h-6 w-6" />
            <div>
              <h2 className="font-semibold text-lg">Meetings</h2>
              <p className="text-orange-50 text-sm">Upload meeting recordings for AI-powered issue extraction</p>
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div className="p-4 border-b border-gray-100">
          {isConverting ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16">
                <CircularProgressbar
                  value={convertProgress}
                  text={`${convertProgress}%`}
                  styles={buildStyles({
                    pathColor: '#8b5cf6',
                    textColor: '#8b5cf6',
                    trailColor: '#ede9fe',
                  })}
                />
              </div>
              <p className="text-sm text-muted-foreground">Converting video to audio...</p>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16">
                <CircularProgressbar
                  value={uploadProgress}
                  text={`${uploadProgress}%`}
                  styles={buildStyles({
                    pathColor: '#f97316',
                    textColor: '#f97316',
                    trailColor: '#fed7aa',
                  })}
                />
              </div>
              <p className="text-sm text-muted-foreground">Uploading recording...</p>
            </div>
          ) : uploadSuccess ? (
            <div className="flex flex-col items-center gap-2 py-4 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
              <p className="text-sm font-medium">Upload complete! Processing in background.</p>
              <Button variant="ghost" size="sm" onClick={() => setUploadSuccess(false)} className="text-xs">
                Upload another
              </Button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? 'Drop the recording here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-500 mt-1">MP3, WAV, M4A, MP4, MOV · Max 200MB</p>
            </div>
          )}
        </div>

        {/* Meetings list */}
        <div className="max-h-[400px] overflow-y-auto">
          {!meetings || meetings.length === 0 ? (
            <div className="p-8 text-center">
              <Presentation className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No meetings uploaded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 flex-shrink-0">
                    <Presentation className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{meeting.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={meeting.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {meeting.status === 'COMPLETED' ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {meeting.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {meeting.issues.length} issues
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(meeting.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {meeting.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMeeting(meeting.id)}
                      >
                        View Issues
                      </Button>
                    )}
                    {meeting.status === 'PROCESSING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          toast.info('Retrying processing...')
                          try {
                            await axios.post('/api/process-meeting', {
                              meetingId: meeting.id,
                              meetingUrl: meeting.meetingUrl,
                            })
                            await refetchMeetings()
                          } catch {
                            toast.error('Retry failed')
                          }
                        }}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      disabled={deleteMeetingMutation.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deleteMeetingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Issues Sheet */}
      <Sheet open={!!selectedMeeting} onOpenChange={(open) => { if (!open) setSelectedMeeting(null) }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto overflow-x-hidden">
          <SheetHeader className="text-left">
            <SheetTitle>
              {meetings?.find((m) => m.id === selectedMeeting)?.name} — Issues
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {(() => {
              const issues = meetings?.find((m) => m.id === selectedMeeting)?.issues ?? []
              if (issues.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                    <Presentation className="h-8 w-8 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">
                      No issues were extracted from this meeting.
                    </p>
                  </div>
                )
              }
              return issues.map((issue) => (
                <div key={issue.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-gray-900">{issue.headline}</h3>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {issue.start}s – {issue.end}s
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mt-1">{issue.gist}</p>
                  <p className="text-sm text-gray-600 mt-2">{issue.summary}</p>
                </div>
              ))
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
