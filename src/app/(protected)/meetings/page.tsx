'use client'

import { useProject } from '@/hooks/use-project'
import { api } from '@/trpc/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Presentation, Trash2, Loader2, Clock, CheckCircle } from 'lucide-react'
import { useRefetch } from '@/hooks/use-refetch'
import { toast } from 'sonner'

export default function MeetingsPage() {
  const { project } = useProject()
  const { data: meetings, isLoading } = api.project.getMeetings.useQuery(
    { projectId: project?.id ?? '' },
    { enabled: !!project?.id }
  )
  const deleteMeeting = api.project.deleteMeeting.useMutation()
  const refetch = useRefetch()

  const handleDelete = (meetingId: string) => {
    deleteMeeting.mutate(
      { meetingId },
      {
        onSuccess: async () => {
          toast.success('Meeting deleted')
          await refetch()
        },
        onError: () => toast.error('Failed to delete meeting'),
      }
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Presentation className="h-12 w-12 text-muted-foreground opacity-50" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">No project selected</h2>
          <p className="text-sm text-muted-foreground">
            Select a project from the sidebar to view meetings
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uploaded meetings for <strong>{project.name}</strong>
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : !meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <Presentation className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            No meetings uploaded yet. Upload a meeting recording from the Dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Sheet key={meeting.id}>
              <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Presentation className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{meeting.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={meeting.status === 'COMPLETED' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {meeting.status === 'COMPLETED' ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {meeting.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {meeting.issues.length} issues found
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(meeting.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {meeting.status === 'COMPLETED' && meeting.issues.length > 0 && (
                    <SheetTrigger asChild>
                      <Button size="sm" variant="outline">
                        View Issues
                      </Button>
                    </SheetTrigger>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(meeting.id)}
                    disabled={deleteMeeting.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {deleteMeeting.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <SheetContent className="sm:max-w-xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{meeting.name} — Issues</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {meeting.issues.map((issue) => (
                      <div key={issue.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm text-gray-900">
                            {issue.headline}
                          </h3>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {issue.start}s – {issue.end}s
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-emerald-600 mt-1">{issue.gist}</p>
                        <p className="text-sm text-gray-600 mt-2">{issue.summary}</p>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </div>
            </Sheet>
          ))}
        </div>
      )}
    </div>
  )
}
