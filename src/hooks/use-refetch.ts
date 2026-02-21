'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function useRefetch() {
  const queryClient = useQueryClient()

  const refetchAll = useCallback(async () => {
    await queryClient.refetchQueries({ type: 'active' })
  }, [queryClient])

  return refetchAll
}
