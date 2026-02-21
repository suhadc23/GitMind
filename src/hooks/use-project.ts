'use client'

import { api } from '@/trpc/react'
import { useLocalStorage } from 'usehooks-ts'

export function useProject() {
  const { data: projects } = api.project.getProjects.useQuery()
  const [projectId, setProjectId] = useLocalStorage('gitmind-projectId', '')

  const project = projects?.find((p) => p.id === projectId)

  return {
    projects,
    project,
    projectId,
    setProjectId,
  }
}
