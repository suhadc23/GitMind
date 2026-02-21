import { NextRequest, NextResponse } from 'next/server'
import { summarizeCode } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { content, fileName } = await req.json()
    if (!content || !fileName) {
      return NextResponse.json({ error: 'content and fileName required' }, { status: 400 })
    }
    const summary = await summarizeCode(content, fileName)
    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Summarize doc error:', error)
    return NextResponse.json({ error: 'Failed to summarize' }, { status: 500 })
  }
}
