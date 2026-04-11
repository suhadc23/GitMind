import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { db } from '@/server/db'
import { generateEmbedding } from '@/lib/ai'

function cosine(a: number[], b: number[]): number {
  let dot = 0, ma = 0, mb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    ma += a[i]! * a[i]!
    mb += b[i]! * b[i]!
  }
  return dot / (Math.sqrt(ma) * Math.sqrt(mb))
}

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

  // Load all files for these projects
  const allFiles = await db.sourceCodeEmbedding.findMany({
    where: { projectId: { in: projectIds } },
  })

  // Try vector similarity first, fall back to keyword if no embeddings stored yet
  const questionVector = await generateEmbedding(question)
  const hasVectors = allFiles.some((f) => Array.isArray(f.embedding) && (f.embedding as number[]).length > 0)

  let embeddings: typeof allFiles

  if (questionVector.length > 0 && hasVectors) {
    // Vector path — score every file by cosine similarity
    const scored = allFiles.map((f) => {
      const vec = Array.isArray(f.embedding) ? (f.embedding as number[]) : []
      const score = vec.length > 0 ? cosine(questionVector, vec) : 0
      // README bonus — always floats to top
      const bonus = /readme/i.test(f.fileName) ? 0.3 : 0
      return { ...f, _score: score + bonus }
    })
    embeddings = scored.sort((a, b) => b._score - a._score).slice(0, 15)
  } else {
    // Keyword fallback for repos indexed before vectors were added
    const keywords = extractKeywords(question)
    const readmeFiles = allFiles.filter((f) => /readme/i.test(f.fileName))
    const readmeIds = new Set(readmeFiles.map((r) => r.id))
    const rest = allFiles.filter((f) => !readmeIds.has(f.id))
    const ranked = rest
      .map((e) => ({
        ...e,
        _hits: keywords.reduce((s, kw) => {
          const hay = `${e.fileName} ${e.summary}`.toLowerCase()
          return s + (hay.includes(kw) ? 1 : 0)
        }, 0),
      }))
      .sort((a, b) => b._hits - a._hits)
    embeddings = [...readmeFiles, ...ranked].slice(0, 10)
  }

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
${isAllProjects ? 'The context below comes from MULTIPLE repositories. When referencing files, always mention which project they belong to.' : ''}

Always format your response using clear Markdown:
- Use ## or ### headings to organize distinct sections
- Use bullet points (- item) or numbered lists for steps, options, or multiple items
- Use \`inline code\` for file names, variable names, function names, and short snippets
- Use fenced code blocks (\`\`\`language\\n...\\n\`\`\`) for any multi-line code examples
- Use **bold** for key terms and important points
- Separate paragraphs and sections with blank lines
- Never write a long wall of text — always break into structured sections

START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

When answering, be accurate and reference specific files when relevant.`

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
