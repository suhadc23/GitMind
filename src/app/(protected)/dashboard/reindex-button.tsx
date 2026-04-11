'use client'

import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useProject } from '@/hooks/use-project'
import { api } from '@/trpc/react'

export function ReIndexButton() {
  const { projectId } = useProject()

  const reIndex = api.project.reIndexProject.useMutation({
    onSuccess: (result) => {
      const parts: string[] = []
      if (result.added)     parts.push(`${result.added} new`)
      if (result.updated)   parts.push(`${result.updated} updated`)
      if (result.removed)   parts.push(`${result.removed} removed`)
      if (result.unchanged) parts.push(`${result.unchanged} unchanged`)

      const detail = parts.length > 0 ? ` — ${parts.join(', ')}` : ''
      toast.success(`Re-index complete${detail}`)
    },
    onError: (err) => toast.error(err.message),
  })

  if (!projectId) return null

  return (
    <Button
      onClick={() => reIndex.mutate({ projectId })}
      disabled={reIndex.isPending}
      size="sm"
      variant="outline"
      className="gap-2 text-muted-foreground"
    >
      <RefreshCw className={`h-4 w-4 ${reIndex.isPending ? 'animate-spin' : ''}`} />
      {reIndex.isPending ? 'Re-indexing…' : 'Re-index'}
    </Button>
  )
}
