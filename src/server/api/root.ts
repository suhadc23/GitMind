import { createCallerFactory, createTRPCRouter } from './trpc'
import { projectRouter } from './routers/project'
import { reviewRouter } from './routers/review'
import { knowledgeGraphRouter } from './routers/knowledge-graph'

export const appRouter = createTRPCRouter({
  project: projectRouter,
  review: reviewRouter,
  knowledgeGraph: knowledgeGraphRouter,
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
