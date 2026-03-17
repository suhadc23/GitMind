import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, branch, path } = await req.json()

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    const fileRes = await fetch(rawUrl)
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Could not fetch file' }, { status: 404 })
    }

    const code = await fileRes.text()
    const snippet = code.slice(0, 8000)

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a senior software engineer. Summarize what this file does in exactly 2 concise sentences. Be technical and specific.',
        },
        {
          role: 'user',
          content: `File: ${path}\n\n\`\`\`\n${snippet}\n\`\`\``,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 120,
    })

    const summary = completion.choices[0]?.message?.content ?? ''
    return NextResponse.json({ summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
