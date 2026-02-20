import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { askAI } from '@/lib/ai'

// Get or create user in database
async function getOrCreateUser(clerkId: string) {
  let user = await db.user.findUnique({
    where: { id: clerkId },
  })

  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    user = await db.user.create({
      data: {
        id: clerkUser.id,
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

// Fetch indexed code summaries from database
async function fetchIndexedCode(projectId: string): Promise<string | null> {
  try {
    const embeddings = await db.sourceCodeEmbedding.findMany({
      where: { projectId },
      select: {
        fileName: true,
        summary: true,
        sourceCode: true,
      },
      take: 15, // Limit to 15 most relevant files
      orderBy: { createdAt: 'desc' },
    })

    if (embeddings.length === 0) return null

    // Build context from code summaries
    let context = '=== INDEXED CODE FILES ===\n\n'

    for (const file of embeddings) {
      context += `\n📄 File: ${file.fileName}\n`
      context += `📝 Summary: ${file.summary}\n`
      context += `💻 Code Preview:\n\`\`\`\n${file.sourceCode.slice(0, 500)}...\n\`\`\`\n\n`
    }

    return context
  } catch (error) {
    console.error('Error fetching indexed code:', error)
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

// askGemini function now imported from @/lib/gemini

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

    // Fetch repo context - prioritize indexed code over README
    const [repoInfo, indexedCode, readme] = await Promise.all([
      fetchRepoInfo(project.githubUrl),
      fetchIndexedCode(projectId),
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

    // Use indexed code if available, otherwise fall back to README
    if (indexedCode) {
      context += `\n${indexedCode}\n`
      console.log('✅ Using indexed code for AI context')
    } else if (readme) {
      // Truncate README if too long
      const truncatedReadme = readme.length > 8000 ? readme.substring(0, 8000) + '...' : readme
      context += `\nREADME:\n${truncatedReadme}\n`
      console.log('ℹ️ Using README for AI context (no indexed code available)')
    } else {
      console.log('⚠️ No code context available')
    }

    // Call AI (Groq or Gemini)
    const answer = await askAI(question, context)

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
