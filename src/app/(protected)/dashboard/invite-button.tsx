'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useProject } from '@/hooks/use-project'
import { Copy, Check, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export function InviteButton() {
  const { projectId } = useProject()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${projectId}`
      : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!projectId) return null

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a Team Member</DialogTitle>
            <DialogDescription>
              Share this link to invite someone to collaborate on this project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="text-sm" />
            <Button onClick={handleCopy} size="icon" variant="outline">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Invite Member
      </Button>
    </>
  )
}
