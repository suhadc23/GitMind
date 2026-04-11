'use client'

import { useEffect } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { api } from '@/trpc/react'

export function usePRChannel(pullRequestId: string | undefined) {
  const utils = api.useUtils()

  useEffect(() => {
    if (!pullRequestId) return

    const pusher = getPusherClient()
    const channel = pusher.subscribe(`pr-${pullRequestId}`)

    channel.bind('new-comment', () => {
      utils.review.getPullRequest.invalidate({ pullRequestId })
      utils.review.getComments.invalidate({ pullRequestId })
    })

    channel.bind('comment-resolved', () => {
      utils.review.getPullRequest.invalidate({ pullRequestId })
      utils.review.getComments.invalidate({ pullRequestId })
    })

    channel.bind('review-submitted', () => {
      utils.review.getPullRequest.invalidate({ pullRequestId })
    })

    channel.bind('ai-review-complete', () => {
      utils.review.getPullRequest.invalidate({ pullRequestId })
      utils.review.getComments.invalidate({ pullRequestId })
    })

    channel.bind('reviewer-assigned', () => {
      utils.review.getPullRequest.invalidate({ pullRequestId })
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`pr-${pullRequestId}`)
    }
  }, [pullRequestId, utils])
}
