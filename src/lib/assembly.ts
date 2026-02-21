import { AssemblyAI } from 'assemblyai'
import { db } from '@/server/db'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY ?? '',
})

export async function processMeeting(meetingUrl: string, meetingId: string) {
  const { chapters } = await client.transcripts.transcribe({
    audio: meetingUrl,
    auto_chapters: true,
  })

  if (!chapters) {
    await db.meeting.update({
      where: { id: meetingId },
      data: { status: 'COMPLETED' },
    })
    return
  }

  await db.issue.createMany({
    data: chapters.map((chapter) => ({
      start: chapter.start.toString(),
      end: chapter.end.toString(),
      gist: chapter.gist,
      headline: chapter.headline,
      summary: chapter.summary,
      meetingId,
    })),
  })

  await db.meeting.update({
    where: { id: meetingId },
    data: { status: 'COMPLETED' },
  })
}
