import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { buildKnowledgeGraph } from '@/lib/graph-builder'

export const knowledgeGraphRouter = createTRPCRouter({
  // Trigger async graph build
  buildGraph: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.userToProject.findUnique({
        where: { userId_projectId: { userId: ctx.userId, projectId: input.projectId } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN' })

      // Check if already building
      const existing = await ctx.db.graphBuildStatus.findUnique({
        where: { projectId: input.projectId },
      })
      if (existing?.status === 'BUILDING') {
        return { status: 'ALREADY_BUILDING' }
      }

      // Build in background
      buildKnowledgeGraph(input.projectId)

      return { status: 'STARTED' }
    }),

  // Poll build status
  getGraphStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const status = await ctx.db.graphBuildStatus.findUnique({
        where: { projectId: input.projectId },
      })
      return status || { status: 'IDLE', progress: 0, nodesCount: 0, edgesCount: 0 }
    }),

  // Get full graph data with optional filters
  getGraph: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filters: z
          .object({
            layers: z.array(z.string()).optional(),
            languages: z.array(z.string()).optional(),
            nodeTypes: z.array(z.string()).optional(),
            search: z.string().optional(),
            author: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId }

      if (input.filters?.layers?.length) {
        where.layer = { in: input.filters.layers }
      }
      if (input.filters?.languages?.length) {
        where.language = { in: input.filters.languages }
      }
      if (input.filters?.nodeTypes?.length) {
        where.type = { in: input.filters.nodeTypes }
      }
      if (input.filters?.search) {
        where.name = { contains: input.filters.search, mode: 'insensitive' }
      }
      if (input.filters?.author) {
        where.lastAuthor = { contains: input.filters.author, mode: 'insensitive' }
      }

      const nodes = await ctx.db.graphNode.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          filePath: true,
          language: true,
          layer: true,
          lastAuthor: true,
          aiSummary: true,
          startLine: true,
          endLine: true,
          metadata: true,
          _count: { select: { inEdges: true, outEdges: true } },
        },
      })

      const nodeIds = new Set(nodes.map((n) => n.id))

      const edges = await ctx.db.graphEdge.findMany({
        where: {
          projectId: input.projectId,
          sourceNodeId: { in: [...nodeIds] },
          targetNodeId: { in: [...nodeIds] },
        },
        select: {
          id: true,
          sourceNodeId: true,
          targetNodeId: true,
          type: true,
        },
      })

      return { nodes, edges }
    }),

  // Get detailed info for a single node
  getNodeDetail: protectedProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const node = await ctx.db.graphNode.findUnique({
        where: { id: input.nodeId },
        include: {
          outEdges: {
            include: { targetNode: { select: { id: true, name: true, type: true, filePath: true } } },
          },
          inEdges: {
            include: { sourceNode: { select: { id: true, name: true, type: true, filePath: true } } },
          },
        },
      })
      if (!node) throw new TRPCError({ code: 'NOT_FOUND' })

      // Fetch source code from SourceCodeEmbedding
      const embedding = await ctx.db.sourceCodeEmbedding.findFirst({
        where: { projectId: node.projectId, fileName: node.filePath },
        select: { sourceCode: true },
      })

      return { ...node, sourceCode: embedding?.sourceCode || null }
    }),

  // Dead code detection: nodes with no incoming edges
  getDeadCode: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Entry point patterns that are expected to have no incoming edges
      const entryPointPatterns = [
        'page.tsx', 'page.ts', 'page.jsx', 'page.js',
        'layout.tsx', 'layout.ts',
        'route.ts', 'route.js',
        'loading.tsx', 'error.tsx',
        'not-found.tsx',
        'main.py', 'app.py', 'manage.py',
      ]

      const allNodes = await ctx.db.graphNode.findMany({
        where: { projectId: input.projectId, type: 'FILE' },
        select: { id: true, name: true, filePath: true, language: true, layer: true },
      })

      const nodesWithIncoming = await ctx.db.graphEdge.findMany({
        where: { projectId: input.projectId },
        select: { targetNodeId: true },
        distinct: ['targetNodeId'],
      })

      const referencedIds = new Set(nodesWithIncoming.map((e) => e.targetNodeId))

      const deadCode = allNodes.filter((node) => {
        if (referencedIds.has(node.id)) return false
        // Skip entry points
        const fileName = node.filePath.split('/').pop() || ''
        if (entryPointPatterns.includes(fileName)) return false
        if (node.filePath.includes('/api/')) return false
        return true
      })

      return deadCode
    }),

  // Impact analysis: BFS through reverse edges
  getImpactAnalysis: protectedProcedure
    .input(z.object({ nodeId: z.string(), depth: z.number().min(1).max(10).default(5) }))
    .query(async ({ ctx, input }) => {
      const sourceNode = await ctx.db.graphNode.findUnique({
        where: { id: input.nodeId },
        select: { id: true, name: true, type: true, filePath: true, projectId: true },
      })
      if (!sourceNode) throw new TRPCError({ code: 'NOT_FOUND' })

      // BFS through reverse edges (who depends on this node?)
      const visited = new Map<string, number>() // nodeId -> distance
      const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: input.nodeId, distance: 0 }]
      visited.set(input.nodeId, 0)

      while (queue.length > 0) {
        const current = queue.shift()!
        if (current.distance >= input.depth) continue

        const inEdges = await ctx.db.graphEdge.findMany({
          where: { targetNodeId: current.nodeId },
          select: { sourceNodeId: true },
        })

        for (const edge of inEdges) {
          if (!visited.has(edge.sourceNodeId)) {
            visited.set(edge.sourceNodeId, current.distance + 1)
            queue.push({ nodeId: edge.sourceNodeId, distance: current.distance + 1 })
          }
        }
      }

      // Remove source node from results
      visited.delete(input.nodeId)

      // Fetch node details for impacted nodes
      const impactedNodeIds = [...visited.keys()]
      const impactedNodes = await ctx.db.graphNode.findMany({
        where: { id: { in: impactedNodeIds } },
        select: { id: true, name: true, type: true, filePath: true, layer: true },
      })

      const results = impactedNodes.map((node) => ({
        ...node,
        distance: visited.get(node.id) || 0,
      }))

      results.sort((a, b) => a.distance - b.distance)

      return {
        sourceNode,
        impactedNodes: results,
        totalImpacted: results.length,
      }
    }),

  // Get available filter options
  getFilterOptions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const nodes = await ctx.db.graphNode.findMany({
        where: { projectId: input.projectId },
        select: { language: true, layer: true, type: true, lastAuthor: true },
      })

      const languages = [...new Set(nodes.map((n) => n.language).filter(Boolean))]
      const layers = [...new Set(nodes.map((n) => n.layer).filter(Boolean))] as string[]
      const types = [...new Set(nodes.map((n) => n.type))]
      const authors = [...new Set(nodes.map((n) => n.lastAuthor).filter(Boolean))] as string[]

      return { languages, layers, types, authors }
    }),
})
