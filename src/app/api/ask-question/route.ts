import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { db } from '@/server/db'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { question, projectId } = (await req.json()) as {
    question: string
    projectId: string
  }

  if (!question || !projectId) {
    return new Response('Missing question or projectId', { status: 400 })
  }

  // Text-based search across source code summaries
  const sourceCodeEmbeddings = await db.sourceCodeEmbedding.findMany({
    where: {
      projectId,
      OR: [
        {
          summary: {
            contains: question.split(' ').slice(0, 5).join(' '),
            mode: 'insensitive',
          },
        },
        {
          fileName: {
            contains: question.split(' ')[0] ?? '',
            mode: 'insensitive',
          },
        },
      ],
    },
    take: 10,
  })

  const embeddings =
    sourceCodeEmbeddings.length > 0
      ? sourceCodeEmbeddings
      : await db.sourceCodeEmbedding.findMany({
          where: { projectId },
          take: 5,
        })

  const context = embeddings
    .map(
      (e) =>
        `File: ${e.fileName}\nSummary: ${e.summary}\n\nCode Snippet:\n${e.sourceCode.slice(0, 2000)}`
    )
    .join('\n\n---\n\n')

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `You are an AI code assistant helping developers understand their codebase.
Your target audience is a technical developer.
You are always friendly, kind, and inspiring, and eager to provide vivid and thoughtful responses.
If the question is asking about code or a specific file, provide the detailed answer with step-by-step instructions.

START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

When answering, focus on being accurate and helpful. Reference specific files when relevant.`,
    prompt: question,
  })

  // Also return file references in headers
  const filesJson = JSON.stringify(
    embeddings.map(({ id, fileName, summary, sourceCode }) => ({
      id,
      fileName,
      summary,
      sourceCode,
    }))
  )

  const response = result.toTextStreamResponse()

  const headers = new Headers(response.headers)
  headers.set('X-Files-References', Buffer.from(filesJson).toString('base64'))
  headers.set('Access-Control-Expose-Headers', 'X-Files-References')

  return new Response(response.body, { headers, status: response.status })
}
