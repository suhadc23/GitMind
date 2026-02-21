import 'server-only'

import { createCaller, type AppRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'
import { createQueryClient } from './query-client'
import { cache } from 'react'
import { headers } from 'next/headers'

const createContext = cache(async () => {
  const heads = new Headers(await headers())
  heads.set('x-trpc-source', 'rsc')
  return createTRPCContext({ headers: heads })
})

export const api = createCaller(createContext)
