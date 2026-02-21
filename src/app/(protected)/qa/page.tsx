'use client'

import { useProject } from '@/hooks/use-project'
import { api } from '@/trpc/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Bot, MessageSquare } from 'lucide-react'
import { CodeReferences } from '../dashboard/code-references'
import MDEditor from '@uiw/react-md-editor'

export default function QAPage() {
  const { project } = useProject()
  const { data: questions, isLoading } = api.project.getAnswers.useQuery(
    { projectId: project?.id ?? '' },
    { enabled: !!project?.id }
  )

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">No project selected</h2>
          <p className="text-sm text-muted-foreground">
            Select a project from the sidebar to view saved Q&As
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Q&A</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Questions and answers saved for <strong>{project.name}</strong>
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : !questions || questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <Bot className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            No saved answers yet. Ask a question on the Dashboard and save it!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Sheet key={q.id}>
              <SheetTrigger asChild>
                <div className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={q.user.imageUrl ?? ''} alt={q.user.firstName ?? ''} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs">
                        {q.user.firstName?.[0]}
                        {q.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{q.answer.slice(0, 100)}...</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </SheetTrigger>
              <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">{q.question}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <MDEditor.Markdown
                      source={q.answer}
                      className="prose max-w-none text-sm dark:prose-invert flex-1"
                    />
                  </div>

                  {Array.isArray(q.filesReferences) && q.filesReferences.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                        Files Referenced:
                      </h3>
                      <CodeReferences
                        filesReferences={
                          q.filesReferences as {
                            fileName: string
                            sourceCode: string
                            summary: string
                          }[]
                        }
                      />
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      )}
    </div>
  )
}
