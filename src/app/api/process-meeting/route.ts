import { NextRequest, NextResponse } from 'next/server'
import { processMeeting } from '@/lib/assembly'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { meetingId, meetingUrl } = await req.json()

    if (!meetingId || !meetingUrl) {
      return NextResponse.json({ error: 'meetingId and meetingUrl are required' }, { status: 400 })
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: 'AssemblyAI not configured' },
        { status: 503 }
      )
    }

    await processMeeting(meetingUrl, meetingId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Process meeting error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
