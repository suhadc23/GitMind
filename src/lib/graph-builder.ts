import { db } from '@/server/db'
import { parseFile, detectLanguage, detectLayer } from './ast-parser'
import { buildFileMap, resolveImport } from './import-resolver'
import { Octokit } from 'octokit'
import { parseGithubUrl } from './github-loader'

export async function buildKnowledgeGraph(projectId: string): Promise<void> {
  console.log(`🔨 Building knowledge graph for project ${projectId}`)

  // Upsert build status
  await db.graphBuildStatus.upsert({
    where: { projectId },
    create: { projectId, status: 'BUILDING', progress: 0 },
    update: { status: 'BUILDING', progress: 0, error: null },
  })

  try {
    // Clear previous graph data
    await db.graphEdge.deleteMany({ where: { projectId } })
    await db.graphNode.deleteMany({ where: { projectId } })

    // Load all indexed source files
    const files = await db.sourceCodeEmbedding.findMany({
      where: { projectId },
      select: { fileName: true, sourceCode: true, summary: true },
    })

    if (files.length === 0) {
      await db.graphBuildStatus.update({
        where: { projectId },
        data: { status: 'COMPLETED', progress: 100, nodesCount: 0, edgesCount: 0, builtAt: new Date() },
      })
      return
    }

    // Build file lookup map for import resolution
    const filePaths = files.map((f) => f.fileName)
    const fileMap = buildFileMap(filePaths)

    // Get project github info for git blame
    const project = await db.project.findUnique({ where: { id: projectId }, select: { githubUrl: true } })
    let lastAuthors: Map<string, string> = new Map()
    if (project?.githubUrl) {
      lastAuthors = await fetchLastAuthors(project.githubUrl, filePaths)
    }

    await db.graphBuildStatus.update({ where: { projectId }, data: { progress: 20 } })

    // Parse each file and create nodes
    const allNodes: Array<{
      name: string
      type: 'FILE' | 'FUNCTION' | 'CLASS' | 'API_ROUTE' | 'DB_QUERY'
      filePath: string
      startLine: number | null
      endLine: number | null
      language: string
      layer: string
      aiSummary: string | null
      lastAuthor: string | null
      metadata: any
    }> = []

    const parsedFiles = new Map<string, ReturnType<typeof parseFile>>()

    for (const file of files) {
      const language = detectLanguage(file.fileName)
      const layer = detectLayer(file.fileName, file.sourceCode)
      const parsed = parseFile(file.sourceCode, file.fileName)
      parsedFiles.set(file.fileName, parsed)

      // FILE node
      allNodes.push({
        name: file.fileName.split('/').pop() || file.fileName,
        type: 'FILE',
        filePath: file.fileName,
        startLine: null,
        endLine: null,
        language,
        layer,
        aiSummary: file.summary,
        lastAuthor: lastAuthors.get(file.fileName) || null,
        metadata: { imports: parsed.imports.length, exports: parsed.exports.length },
      })

      // FUNCTION nodes (only exported ones to reduce noise)
      for (const fn of parsed.functions.filter((f) => f.isExported)) {
        allNodes.push({
          name: fn.name,
          type: 'FUNCTION',
          filePath: file.fileName,
          startLine: fn.startLine,
          endLine: fn.endLine,
          language,
          layer,
          aiSummary: null,
          lastAuthor: lastAuthors.get(file.fileName) || null,
          metadata: { isAsync: fn.isAsync, calls: fn.calls },
        })
      }

      // CLASS nodes
      for (const cls of parsed.classes) {
        allNodes.push({
          name: cls.name,
          type: 'CLASS',
          filePath: file.fileName,
          startLine: cls.startLine,
          endLine: cls.endLine,
          language,
          layer,
          aiSummary: null,
          lastAuthor: lastAuthors.get(file.fileName) || null,
          metadata: { extends: cls.extends, implements: cls.implements },
        })
      }

      // API_ROUTE nodes
      for (const route of parsed.apiRoutes) {
        allNodes.push({
          name: `${route.method} ${file.fileName}`,
          type: 'API_ROUTE',
          filePath: file.fileName,
          startLine: null,
          endLine: null,
          language,
          layer: 'API',
          aiSummary: null,
          lastAuthor: lastAuthors.get(file.fileName) || null,
          metadata: { method: route.method },
        })
      }

      // DB_QUERY nodes
      for (const query of parsed.dbQueries) {
        allNodes.push({
          name: `${query.model}.${query.operation}`,
          type: 'DB_QUERY',
          filePath: file.fileName,
          startLine: null,
          endLine: null,
          language,
          layer: 'DB',
          aiSummary: null,
          lastAuthor: null,
          metadata: { model: query.model, operation: query.operation },
        })
      }
    }

    // Batch create all nodes
    const createdNodes = await Promise.all(
      allNodes.map((node) =>
        db.graphNode.create({
          data: { projectId, ...node },
        })
      )
    )

    // Build lookup maps for edge creation
    const fileNodeMap = new Map<string, string>() // filePath -> nodeId
    const funcNodeMap = new Map<string, string>() // "filePath:funcName" -> nodeId
    const classNodeMap = new Map<string, string>() // className -> nodeId

    for (const node of createdNodes) {
      if (node.type === 'FILE') fileNodeMap.set(node.filePath, node.id)
      if (node.type === 'FUNCTION') funcNodeMap.set(`${node.filePath}:${node.name}`, node.id)
      if (node.type === 'CLASS') classNodeMap.set(node.name, node.id)
    }

    await db.graphBuildStatus.update({ where: { projectId }, data: { progress: 60 } })

    // Create edges
    const edges: Array<{
      sourceNodeId: string
      targetNodeId: string
      type: 'IMPORTS' | 'CALLS' | 'EXTENDS' | 'IMPLEMENTS' | 'USES_ROUTE' | 'QUERIES'
    }> = []

    const edgeSet = new Set<string>()
    function addEdge(sourceId: string, targetId: string, type: string) {
      const key = `${sourceId}:${targetId}:${type}`
      if (!edgeSet.has(key) && sourceId !== targetId) {
        edgeSet.add(key)
        edges.push({ sourceNodeId: sourceId, targetNodeId: targetId, type: type as any })
      }
    }

    for (const file of files) {
      const parsed = parsedFiles.get(file.fileName)
      if (!parsed) continue

      const sourceFileNodeId = fileNodeMap.get(file.fileName)
      if (!sourceFileNodeId) continue

      // IMPORT edges (file → file)
      for (const imp of parsed.imports) {
        const resolvedPath = resolveImport(imp.source, file.fileName, fileMap)
        if (resolvedPath) {
          const targetNodeId = fileNodeMap.get(resolvedPath)
          if (targetNodeId) {
            addEdge(sourceFileNodeId, targetNodeId, 'IMPORTS')
          }
        }
      }

      // CLASS EXTENDS edges
      for (const cls of parsed.classes) {
        if (cls.extends) {
          const classNodeId = classNodeMap.get(cls.name)
          const parentNodeId = classNodeMap.get(cls.extends)
          if (classNodeId && parentNodeId) {
            addEdge(classNodeId, parentNodeId, 'EXTENDS')
          }
        }
      }
    }

    // Batch create edges
    if (edges.length > 0) {
      await db.graphEdge.createMany({
        data: edges.map((e) => ({ projectId, ...e })),
        skipDuplicates: true,
      })
    }

    await db.graphBuildStatus.update({
      where: { projectId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        nodesCount: createdNodes.length,
        edgesCount: edges.length,
        builtAt: new Date(),
      },
    })

    console.log(`✅ Knowledge graph built: ${createdNodes.length} nodes, ${edges.length} edges`)
  } catch (error: any) {
    console.error('Error building knowledge graph:', error)
    await db.graphBuildStatus.update({
      where: { projectId },
      data: { status: 'FAILED', error: error.message || 'Unknown error' },
    })
  }
}

// Fetch last commit author for each file (batched)
async function fetchLastAuthors(
  githubUrl: string,
  filePaths: string[]
): Promise<Map<string, string>> {
  const authors = new Map<string, string>()

  try {
    const { owner, repo } = parseGithubUrl(githubUrl)
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

    const BATCH_SIZE = 10
    for (let i = 0; i < filePaths.length && i < 50; i += BATCH_SIZE) {
      const batch = filePaths.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (filePath) => {
          const { data } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            path: filePath,
            per_page: 1,
          })
          if (data[0]?.commit?.author?.name) {
            return { filePath, author: data[0].commit.author.name }
          }
          return null
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          authors.set(result.value.filePath, result.value.author)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching git blame:', error)
  }

  return authors
}
