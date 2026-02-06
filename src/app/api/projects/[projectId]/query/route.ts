import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// Get or create user in database
async function getOrCreateUser(clerkId: string) {
  let user = await db.user.findUnique({
    where: { clerkId },
  })

  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    user = await db.user.create({
      data: {
        clerkId: clerkUser.id,
        emailAddress: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        credits: 150,
      },
    })
  }

  return user
}

// Fetch README from GitHub
async function fetchRepoReadme(githubUrl: string): Promise<string | null> {
  try {
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return null

    const [, owner, repo] = match

    // Try to fetch README
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        headers: {
          Accept: 'application/vnd.github.v3.raw',
          'User-Agent': 'GitMind-App',
        },
      }
    )

    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

// Fetch repo info from GitHub
async function fetchRepoInfo(githubUrl: string) {
  try {
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return null

    const [, owner, repo] = match
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitMind-App',
      },
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Call Gemini API
async function askGemini(question: string, context: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an AI assistant helping developers understand GitHub repositories.

Based on the following repository information, answer the user's question clearly and concisely.

REPOSITORY CONTEXT:
${context}

USER QUESTION: ${question}

Provide a helpful, accurate answer. If you cannot answer based on the provided context, say so politely and suggest what additional information might help.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Gemini API error:', error)
    throw new Error('Failed to get AI response')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { question } = body

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Get user
    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check credits
    if (user.credits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 403 }
      )
    }

    // Get project
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userToProjects: {
          some: { userId: user.id },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch repo context
    const [repoInfo, readme] = await Promise.all([
      fetchRepoInfo(project.githubUrl),
      fetchRepoReadme(project.githubUrl),
    ])

    // Build context for Gemini
    let context = `Repository: ${project.name}\nGitHub URL: ${project.githubUrl}\n`

    if (repoInfo) {
      context += `Description: ${repoInfo.description || 'No description'}\n`
      context += `Language: ${repoInfo.language || 'Unknown'}\n`
      context += `Stars: ${repoInfo.stargazers_count}\n`
      context += `Forks: ${repoInfo.forks_count}\n`
      context += `Topics: ${repoInfo.topics?.join(', ') || 'None'}\n`
    }

    if (readme) {
      // Truncate README if too long
      const truncatedReadme = readme.length > 8000 ? readme.substring(0, 8000) + '...' : readme
      context += `\nREADME:\n${truncatedReadme}\n`
    }

    // Call Gemini
    const answer = await askGemini(question, context)

    // Save question to database
    const savedQuestion = await db.question.create({
      data: {
        question: question,
        answer: answer,
        projectId: project.id,
        userId: user.id,
      },
    })

    // Deduct credit
    await db.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } },
    })

    return NextResponse.json({
      success: true,
      question: savedQuestion.question,
      answer: savedQuestion.answer,
      creditsRemaining: user.credits - 1,
    })
  } catch (error) {
    console.error('Error processing question:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process question' },
      { status: 500 }
    )
  }
}

// GET - Fetch question history for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get questions for this project
    const questions = await db.question.findMany({
      where: {
        projectId: projectId,
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
