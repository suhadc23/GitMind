import { NextRequest, NextResponse } from 'next/server'
import { processMeeting } from '@/lib/assembly'

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

    // Fire and forget - process in background
    processMeeting(meetingUrl, meetingId).catch((err) => {
      console.error('Meeting processing error:', err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Process meeting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
