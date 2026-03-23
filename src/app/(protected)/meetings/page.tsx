'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Presentation, Trash2, Loader2, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

type Meeting = {
  id: string
  name: string
  status: string
  createdAt: Date
  issues: { id: string; headline: string; gist: string; summary: string; start: string; end: string }[]
}

export default function MeetingsPage() {
  const { data: projects, isLoading, refetch } = api.project.getAllMeetings.useQuery()
  const deleteMeeting = api.project.deleteMeeting.useMutation()
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  const handleDelete = (meetingId: string) => {
    deleteMeeting.mutate(
      { meetingId },
      {
        onSuccess: async () => {
          toast.success('Meeting deleted')
          await refetch()
          if (selectedMeeting?.id === meetingId) setSelectedMeeting(null)
        },
        onError: () => toast.error('Failed to delete meeting'),
      }
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Meetings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Meeting recordings and AI-extracted issues across all your projects
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
      ) : !projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <Presentation className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            No meetings uploaded yet. Open a project and upload a meeting recording.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {projects.map((project) => (
            <div key={project.id}>
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Presentation className="h-4 w-4 text-orange-500" />
                {project.name}
              </h2>
              <div className="space-y-3">
                {project.meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="bg-white rounded-xl border p-4 flex items-center gap-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                      <Presentation className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{meeting.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={meeting.status === 'COMPLETED' ? 'default' : 'secondary'}
                          className={`text-xs ${meeting.status === 'COMPLETED' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                        >
                          {meeting.status === 'COMPLETED' ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
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
                          onClick={() => setSelectedMeeting(meeting as Meeting)}
                        >
                          View Issues
                        </Button>
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issues Sheet */}
      <Sheet open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>{selectedMeeting?.name} — Issues</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedMeeting?.issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                <Presentation className="h-8 w-8 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">
                  No issues were extracted from this meeting.
                </p>
              </div>
            ) : (
              selectedMeeting?.issues.map((issue) => (
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
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
