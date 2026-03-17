'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, SignInButton } from '@clerk/nextjs'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { GitBranch, Users, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function JoinPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()

  const { data: project, isLoading: projectLoading } = api.project.getProjectById.useQuery(
    { projectId },
    { enabled: isSignedIn === true },
  )

  const joinMutation = api.project.joinProject.useMutation({
    onSuccess: (data) => {
      if (data.alreadyMember) {
        toast.info('You are already a member of this project')
      } else {
        toast.success('Joined successfully!')
      }
      router.push('/dashboard')
    },
    onError: (err) => toast.error(err.message),
  })

  // Loading Clerk session
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center space-y-5">
          <div className="flex justify-center">
            <div className="bg-emerald-50 rounded-full p-4">
              <GitBranch className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">You've been invited!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to accept your invitation and join the project.
            </p>
          </div>
          <SignInButton
            mode="redirect"
            forceRedirectUrl={`/join/${projectId}`}
          >
            <Button className="w-full">Sign in to Accept Invitation</Button>
          </SignInButton>
        </div>
      </div>
    )
  }

  // Loading project info
  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Project not found or deleted
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Invite link invalid</h1>
          <p className="text-sm text-muted-foreground">
            This project no longer exists or the invite link is incorrect.
          </p>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="flex justify-center">
          <div className="bg-emerald-50 rounded-full p-4">
            <GitBranch className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">You've been invited to join</p>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:underline"
          >
            {project.githubUrl.replace('https://', '')}
          </a>
        </div>

        {/* Stats */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-gray-50 rounded-lg px-4 py-2">
            <Users className="h-4 w-4" />
            <span>{project._count.userToProjects} member{project._count.userToProjects !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full gap-2"
            onClick={() => joinMutation.mutate({ projectId })}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Accept Invitation
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => router.push('/dashboard')}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  )
}
