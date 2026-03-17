import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AskQuestionCard } from './ask-question-card'
import { CommitLog } from './commit-log'
import { MeetingCard } from './meeting-card'
import { TeamMembers } from './team-members'
import { InviteButton } from './invite-button'
import { ArchiveButton } from './archive-button'
import { DeleteButton } from './delete-button'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a project from the sidebar to get started
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InviteButton />
          <ArchiveButton />
          <DeleteButton />
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3 text-gray-700">Team Members</h2>
        <TeamMembers />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Q&A Card - takes 3 columns */}
        <AskQuestionCard />

        {/* Meeting Upload - takes 2 columns */}
        <MeetingCard />
      </div>

      {/* Commit Log */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
          Commit History
        </h2>
        <CommitLog />
      </div>
    </div>
  )
}
