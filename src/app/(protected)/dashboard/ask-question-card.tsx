'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles } from 'lucide-react'
import { CodeReferences } from './code-references'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { useProject } from '@/hooks/use-project'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type FileReference = {
  id: string
  fileName: string
  sourceCode: string
  summary: string
}

export function AskQuestionCard() {
  const { project } = useProject()
  const [question, setQuestion] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filesReferences, setFilesReferences] = useState<FileReference[]>([])
  const [answer, setAnswer] = useState('')
  const saveAnswer = api.project.saveAnswer.useMutation()

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAnswer('')
    setFilesReferences([])
    setLoading(true)
    setOpen(true)

    try {
      // No projectId → all-projects mode: searches across all user repos
      const response = await fetch('/api/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        throw new Error('Failed to get answer')
      }

      // Extract file references from custom header
      const filesHeader = response.headers.get('X-Files-References')
      if (filesHeader) {
        const files = JSON.parse(Buffer.from(filesHeader, 'base64').toString())
        setFilesReferences(files)
      }

      // Stream the plain text response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          setAnswer((prev) => prev + chunk)
        }
      }
    } catch (error) {
      toast.error('Failed to get answer. Please try again.')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!project?.id) return
    saveAnswer.mutate(
      {
        projectId: project.id,
        question,
        answer,
        filesReferences,
      },
      {
        onSuccess: () => toast.success('Answer saved!'),
        onError: () => toast.error('Failed to save answer.'),
      }
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[80vw] max-h-[80vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                <span className="text-gray-900">{question}</span>
              </DialogTitle>
              <Badge variant="secondary" className="ml-auto">
                {loading ? 'Thinking...' : 'Done'}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Answer */}
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
                  GM
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 overflow-hidden">
                {loading && !answer && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your codebase...
                  </div>
                )}
                <div className="text-sm text-gray-900 break-words space-y-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2 text-gray-900 border-b border-gray-200 pb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1 text-gray-900">{children}</h3>,
                      p: ({ children }) => <p className="mb-3 leading-relaxed text-gray-800">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-gray-800">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-gray-800">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-emerald-400 pl-4 py-1 my-3 bg-emerald-50 rounded-r text-gray-600 italic">{children}</blockquote>
                      ),
                      hr: () => <hr className="my-4 border-gray-200" />,
                      a: ({ href, children }) => (
                        <a href={href} className="text-emerald-600 underline hover:text-emerald-800" target="_blank" rel="noopener noreferrer">{children}</a>
                      ),
                      pre: (props) => (
                        <pre className="overflow-x-auto bg-gray-900 rounded-lg p-4 my-3 text-gray-100 text-xs whitespace-pre" {...props} />
                      ),
                      code: ({ className, children, ...props }: any) => {
                        const isBlock = !!className?.startsWith('language-')
                        return isBlock ? (
                          <code className={className} {...props}>{children}</code>
                        ) : (
                          <code className="bg-gray-100 text-emerald-700 rounded px-1.5 py-0.5 text-xs font-mono" {...props}>{children}</code>
                        )
                      },
                    }}
                  >
                    {answer}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* File References */}
            {filesReferences.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                  Files Referenced:
                </h3>
                <CodeReferences filesReferences={filesReferences} />
              </div>
            )}

            {/* Save Button — only when a project is selected in the sidebar */}
            {!loading && answer && project?.id && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saveAnswer.isPending} size="sm">
                  {saveAnswer.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Answer'
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card className="relative overflow-hidden col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Ask a question
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Textarea
              placeholder="Which file should I edit to change the home page? How does the authentication work?..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={loading || !question.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Ask GitMind
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
