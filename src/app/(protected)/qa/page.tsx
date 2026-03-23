'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Bot, ChevronRight, MessageSquare } from 'lucide-react'
import { CodeReferences } from '../dashboard/code-references'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Question = {
  id: string
  question: string
  answer: string
  createdAt: Date
  filesReferences: unknown
  user: { imageUrl: string | null; firstName: string | null; lastName: string | null }
}

export default function QAPage() {
  const { data: projects, isLoading } = api.project.getAllAnswers.useQuery()
  const [selected, setSelected] = useState<Question | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Q&A</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All saved questions and answers across your projects
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-1/4" />
              {[1, 2].map((j) => (
                <div key={j} className="bg-white rounded-xl border p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <Bot className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            No saved answers yet. Ask a question on a project page and save it!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {projects.map((project) => (
            <div key={project.id} className="space-y-3">
              {/* Project header */}
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                  {project.name[0]?.toUpperCase()}
                </div>
                <h2 className="font-semibold text-gray-900">{project.name}</h2>
                <Badge variant="secondary" className="text-xs">{project.questions.length}</Badge>
              </div>

              {/* Q&A rows */}
              <div className="space-y-2">
                {project.questions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => setSelected(q as Question)}
                    className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-center gap-3"
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={q.user.imageUrl ?? ''} alt={q.user.firstName ?? ''} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs">
                        {q.user.firstName?.[0]}{q.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Answer Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>{selected?.question}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3">
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
                    {selected?.answer ?? ''}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {Array.isArray(selected?.filesReferences) && (selected.filesReferences as unknown[]).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                  Files Referenced:
                </h3>
                <CodeReferences
                  filesReferences={selected.filesReferences as { fileName: string; sourceCode: string; summary: string }[]}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
