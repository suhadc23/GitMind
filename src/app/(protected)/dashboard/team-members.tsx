'use client'

import { useProject } from '@/hooks/use-project'
import { api } from '@/trpc/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Users } from 'lucide-react'

export function TeamMembers() {
  const { project } = useProject()
  const { data: members } = api.project.getTeamMembers.useQuery(
    { projectId: project?.id ?? '' },
    { enabled: !!project?.id }
  )

  if (!project) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {members?.map((member) => (
        <Tooltip key={member.id}>
          <TooltipTrigger>
            <Avatar className="h-8 w-8 ring-2 ring-white">
              <AvatarImage src={member.user.imageUrl ?? ''} alt={member.user.firstName ?? ''} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs">
                {member.user.firstName?.[0]}
                {member.user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <p>{member.user.firstName} {member.user.lastName}</p>
            <p className="text-xs text-muted-foreground">{member.user.emailAddress}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {(!members || members.length === 0) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>No team members yet</span>
        </div>
      )}
    </div>
  )
}
