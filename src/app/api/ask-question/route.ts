import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { db } from '@/server/db'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'it', 'its',
  'for', 'from', 'in', 'into', 'of', 'on', 'or', 'and', 'to', 'at', 'by', 'with', 'about',
  'not', 'no', 'so', 'very', 'just', 'get', 'give', 'show', 'tell', 'find', 'use', 'make',
  'all', 'some', 'any', 'each', 'every', 'more', 'most', 'other', 'same', 'than', 'too',
  'explain', 'describe', 'want', 'know', 'think', 'see', 'look', 'also',
])

function extractKeywords(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { question, projectId } = (await req.json()) as {
    question: string
    projectId?: string
  }

  if (!question) {
    return new Response('Missing question', { status: 400 })
  }

  // Determine which project IDs to search
  let projectIds: string[]
  let projectNames: Record<string, string> = {}

  if (projectId) {
    // Single-project mode (project detail page)
    projectIds = [projectId]
  } else {
    // All-projects mode (dashboard) — search across every repo the user has access to
    const userProjects = await db.project.findMany({
      where: {
        userToProjects: { some: { userId } },
        deletedAt: null,
      },
      select: { id: true, name: true },
    })
    projectIds = userProjects.map((p) => p.id)
    projectNames = Object.fromEntries(userProjects.map((p) => [p.id, p.name]))
  }

  if (projectIds.length === 0) {
    return new Response('No projects found', { status: 404 })
  }

  // Extract meaningful keywords — strip stop words so "what is the logic for voice recognition"
  // becomes ["logic", "voice", "recognition"] instead of matching nothing
  const keywords = extractKeywords(question)
  const orConditions = keywords.flatMap((kw) => [
    { summary: { contains: kw, mode: 'insensitive' as const } },
    { fileName: { contains: kw, mode: 'insensitive' as const } },
    { sourceCode: { contains: kw, mode: 'insensitive' as const } },
  ])

  // Always fetch README first — it contains project description, algorithms, architecture.
  // Include it in context regardless of keyword match so AI always knows what the project is.
  const readmeFiles = await db.sourceCodeEmbedding.findMany({
    where: {
      projectId: { in: projectIds },
      fileName: { contains: 'readme', mode: 'insensitive' },
    },
    take: projectIds.length,
  })
  const readmeIds = new Set(readmeFiles.map((r) => r.id))

  // Keyword-matched files ranked by number of keyword hits (most relevant first)
  let rankedMatches: typeof readmeFiles = []
  if (orConditions.length > 0) {
    const allMatches = await db.sourceCodeEmbedding.findMany({
      where: { projectId: { in: projectIds }, OR: orConditions },
    })

    rankedMatches = allMatches
      .filter((e) => !readmeIds.has(e.id)) // README already included above
      .map((e) => ({
        ...e,
        _hits: keywords.reduce((s, kw) => {
          const hay = `${e.fileName} ${e.summary} ${e.sourceCode}`.toLowerCase()
          return s + (hay.includes(kw) ? 1 : 0)
        }, 0),
      }))
      .sort((a, b) => b._hits - a._hits)
      .slice(0, 10 - readmeFiles.length)
  }

  // Fallback: if nothing keyword-matched, grab a few files so AI has some context
  const fallbackFiles =
    rankedMatches.length === 0
      ? await db.sourceCodeEmbedding.findMany({
        where: {
          projectId: { in: projectIds },
          id: { notIn: [...readmeIds] },
        },
        take: 5,
      })
      : []

  const embeddings = [...readmeFiles, ...rankedMatches, ...fallbackFiles].slice(0, 10)

  // Build context — include project name when in all-projects mode
  const context = embeddings
    .map((e) => {
      const projectLabel = projectNames[e.projectId]
        ? `Project: ${projectNames[e.projectId]} | `
        : ''
      return `${projectLabel}File: ${e.fileName}\nSummary: ${e.summary}\n\nCode:\n${e.sourceCode.slice(0, 6000)}`
    })
    .join('\n\n---\n\n')

  const isAllProjects = !projectId && projectIds.length > 1
  const systemPrompt = `You are an AI code assistant helping developers understand their codebase.
Your target audience is a technical developer.
You are always friendly, kind, and inspiring, and eager to provide vivid and thoughtful responses.
If the question is asking about code or a specific file, provide the detailed answer with step-by-step instructions.
${isAllProjects ? 'The context below comes from MULTIPLE repositories. When referencing files, always mention which project they belong to.' : ''}

START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

When answering, focus on being accurate and helpful. Reference specific files when relevant.`

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    prompt: question,
  })

  const filesJson = JSON.stringify(
    embeddings.map(({ id, fileName, summary, sourceCode, projectId: pid }) => ({
      id,
      fileName,
      summary,
      sourceCode,
      projectName: projectNames[pid] ?? undefined,
    }))
  )

  const response = result.toTextStreamResponse()
  const headers = new Headers(response.headers)
  headers.set('X-Files-References', Buffer.from(filesJson).toString('base64'))
  headers.set('Access-Control-Expose-Headers', 'X-Files-References')

  return new Response(response.body, { headers, status: response.status })
}
