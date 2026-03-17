'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteButton() {
  const { projectId, clearProject } = useProject()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const utils = api.useUtils()

  const handleDelete = async () => {
    if (!projectId) return
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete project')
      }

      toast.success('Project deleted permanently')
      setOpen(false)
      clearProject()
      await utils.project.getProjects.invalidate()
      router.push('/projects')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!projectId) return null

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This will permanently delete the project and all its data — indexed
              code, questions, answers, commits, and meetings. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete permanently'
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
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </>
  )
}
