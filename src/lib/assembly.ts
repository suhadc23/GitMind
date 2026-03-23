import { AssemblyAI } from 'assemblyai'
import Groq from 'groq-sdk'
import { db } from '@/server/db'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY ?? '',
})

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

interface ExtractedIssue {
  gist: string
  headline: string
  summary: string
  start: string
  end: string
}

async function extractIssuesWithGroq(transcript: string): Promise<ExtractedIssue[]> {
  const wordCount = transcript.split(' ').length
  // Estimate timing: ~150 words per minute
  const totalMs = Math.round((wordCount / 150) * 60 * 1000)
  const chunkMs = Math.round(totalMs / 5)

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content: `You are an expert meeting analyst. Extract key issues, decisions, and action items from meeting transcripts.
The transcript may be in any language — always respond in English.
Return ONLY a valid JSON array, no markdown, no explanation.`,
      },
      {
        role: 'user',
        content: `Analyze this meeting transcript and extract 3-8 key issues or discussion points.

TRANSCRIPT:
${transcript.slice(0, 12000)}

Return a JSON array of objects with this exact shape:
[
  {
    "gist": "one-line topic label",
    "headline": "short descriptive title (max 10 words)",
    "summary": "2-3 sentence explanation of what was discussed or decided",
    "start": "estimated start time in ms as a string",
    "end": "estimated end time in ms as a string"
  }
]

Distribute start/end times evenly across the total estimated duration of ${totalMs}ms.
Each segment should be roughly ${chunkMs}ms long.`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '[]'
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned) as ExtractedIssue[]
}

export async function processMeeting(meetingUrl: string, meetingId: string) {
  console.log(`[processMeeting] Starting for meetingId=${meetingId}, url=${meetingUrl}`)

  const transcript = await client.transcripts.transcribe({
    audio: meetingUrl,
    speech_models: ['universal-2'],
  })

  console.log(`[processMeeting] Transcript status=${transcript.status}, text length=${transcript.text?.length ?? 0}`)
  if (transcript.error) console.error(`[processMeeting] AssemblyAI error:`, transcript.error)

  if (!transcript.text) {
    console.warn(`[processMeeting] Empty transcript — marking COMPLETED with 0 issues`)
    await db.meeting.update({
      where: { id: meetingId },
      data: { status: 'COMPLETED' },
    })
    return
  }

  console.log(`[processMeeting] Transcript preview: "${transcript.text.slice(0, 200)}..."`)

  let issues: ExtractedIssue[] = []
  try {
    issues = await extractIssuesWithGroq(transcript.text)
    console.log(`[processMeeting] Groq extracted ${issues.length} issues`)
  } catch (err) {
    console.error('[processMeeting] Groq issue extraction failed:', err)
  }

  if (issues.length > 0) {
    await db.issue.createMany({
      data: issues.map((issue) => ({
        start: issue.start,
        end: issue.end,
        gist: issue.gist,
        headline: issue.headline,
        summary: issue.summary,
        meetingId,
      })),
    })
  }

  await db.meeting.update({
    where: { id: meetingId },
    data: { status: 'COMPLETED' },
  })
  console.log(`[processMeeting] Done — ${issues.length} issues saved`)
}
