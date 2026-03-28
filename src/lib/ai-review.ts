import Groq from 'groq-sdk'
import { db } from '@/server/db'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

// Generate a one-paragraph summary of an entire PR
export async function generatePRSummary(
  title: string,
  description: string | null,
  fullDiff: string
): Promise<string> {
  try {
    const truncatedDiff = fullDiff.slice(0, 15000)

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a senior software engineer. Summarize this pull request in ONE concise paragraph covering: what changed, why it changed, and any notable technical decisions or risks.',
        },
        {
          role: 'user',
          content: `PR Title: ${title}\nPR Description: ${description || 'No description provided.'}\n\nDiff:\n${truncatedDiff}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 400,
    })

    return completion.choices[0]?.message?.content || 'Could not generate summary.'
  } catch (error) {
    console.error('Error generating PR summary:', error)
    return 'AI summary generation failed.'
  }
}

interface AIReviewComment {
  lineNumber: number
  category: 'SECURITY' | 'PERFORMANCE' | 'STYLE' | 'BUG' | 'GENERAL'
  severity: number
  body: string
}

// Generate AI review comments for a single file's diff
export async function generateFileReview(
  fileName: string,
  patch: string
): Promise<AIReviewComment[]> {
  try {
    if (!patch || patch.length < 10) return []

    const truncatedPatch = patch.slice(0, 8000)

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert code reviewer. Analyze the following diff and identify real issues.
For each issue, respond with a JSON array of objects with these fields:
- lineNumber (the line in the NEW file where the issue appears)
- category: one of "SECURITY", "PERFORMANCE", "STYLE", "BUG", "GENERAL"
- severity: 1-5 (5 = critical)
- body: a clear, actionable explanation of the issue and how to fix it

Rules:
- Only report genuine issues, not nitpicks
- Be specific about which line and why it's problematic
- Suggest concrete fixes
- If the code looks fine, return an empty array []
- Respond with ONLY the JSON array, no other text`,
        },
        {
          role: 'user',
          content: `File: ${fileName}\nDiff:\n${truncatedPatch}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content || '[]'

    // Strip markdown code fences if present
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item: any) =>
        typeof item.lineNumber === 'number' &&
        typeof item.category === 'string' &&
        typeof item.severity === 'number' &&
        typeof item.body === 'string'
    )
  } catch (error) {
    console.error(`Error reviewing file ${fileName}:`, error)
    return []
  }
}

// Orchestrate full AI review for a PR
export async function runAIReview(pullRequestId: string): Promise<void> {
  try {
    const pr = await db.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: { files: true, project: true },
    })
    if (!pr) return

    // Generate PR summary from all patches combined
    const allPatches = pr.files
      .map((f) => `--- ${f.fileName} ---\n${f.patch || ''}`)
      .join('\n\n')

    const summary = await generatePRSummary(pr.title, pr.description, allPatches)
    await db.pullRequest.update({
      where: { id: pullRequestId },
      data: { aiSummary: summary },
    })

    // Review each file (batched, 5 concurrent)
    const BATCH_SIZE = 5
    for (let i = 0; i < pr.files.length; i += BATCH_SIZE) {
      const batch = pr.files.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          if (!file.patch) return []
          const comments = await generateFileReview(file.fileName, file.patch)
          return comments.map((c) => ({
            pullRequestId,
            prFileId: file.id,
            lineNumber: c.lineNumber,
            side: 'right' as const,
            body: c.body,
            commentType: 'AI' as const,
            aiCategory: c.category,
            severity: c.severity,
          }))
        })
      )

      const commentsToCreate = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => (r as PromiseFulfilledResult<any[]>).value)

      if (commentsToCreate.length > 0) {
        await db.reviewComment.createMany({ data: commentsToCreate })
      }
    }

    console.log(`✅ AI review complete for PR #${pr.githubPrNumber}`)
  } catch (error) {
    console.error('Error running AI review:', error)
  }
}
