'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useProject } from '@/hooks/use-project'
import { api } from '@/trpc/react'
import { useRefetch } from '@/hooks/use-refetch'
import { toast } from 'sonner'
import { Archive, Loader2 } from 'lucide-react'

export function ArchiveButton() {
  const { projectId } = useProject()
  const [open, setOpen] = useState(false)
  const refetch = useRefetch()

  const archiveProject = api.project.archiveProject.useMutation()

  const handleArchive = async () => {
    if (!projectId) return
    archiveProject.mutate(
      { projectId },
      {
        onSuccess: async () => {
          toast.success('Project archived')
          setOpen(false)
          await refetch()
        },
        onError: () => toast.error('Failed to archive project'),
      }
    )
  }

  if (!projectId) return null

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this project? It will be hidden from
              your dashboard but not permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={archiveProject.isPending}
            >
              {archiveProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                'Archive'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="ghost"
        className="gap-2 text-muted-foreground hover:text-destructive"
      >
        <Archive className="h-4 w-4" />
        Archive
      </Button>
    </>
  )
}
