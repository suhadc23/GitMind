import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { indexGithubRepo, checkCredits } from '@/lib/github-loader'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get project and verify ownership
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        userToProjects: {
          where: { userId },
        },
      },
    })

    if (!project || project.userToProjects.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Check if already indexed
    const existingEmbeddings = await db.sourceCodeEmbedding.count({
      where: { projectId },
    })

    if (existingEmbeddings > 0) {
      return NextResponse.json(
        {
          error: 'Project already indexed',
          message: `This project has ${existingEmbeddings} files already indexed.`,
        },
        { status: 400 }
      )
    }

    // Check file count and calculate credits needed
    console.log('📊 Checking repository size...')
    const fileCount = await checkCredits(project.githubUrl)
    const creditsNeeded = Math.ceil(fileCount / 10) // 1 credit per 10 files

    console.log(`📈 Repository has ${fileCount} files`)
    console.log(`💰 Credits needed: ${creditsNeeded}`)
    console.log(`👤 User has: ${user.credits} credits`)

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          message: `This repository has ${fileCount} files and requires ${creditsNeeded} credits. You have ${user.credits} credits.`,
          creditsNeeded,
          userCredits: user.credits,
          fileCount,
        },
        { status: 403 }
      )
    }

    // Start indexing process
    console.log(`🚀 Starting indexing...`)
    console.log(`   Project: ${project.name}`)
    console.log(`   Repository: ${project.githubUrl}`)
    console.log(`   Files: ${fileCount}`)

    const result = await indexGithubRepo(projectId, project.githubUrl)

    // Deduct credits after successful indexing
    await db.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: creditsNeeded,
        },
      },
    })

    console.log('✅ Indexing complete!')
    console.log(`   Indexed: ${result.indexed} files`)
    console.log(`   Credits used: ${creditsNeeded}`)

    return NextResponse.json({
      success: true,
      message: 'Repository indexed successfully!',
      indexed: result.indexed,
      total: result.total,
      creditsUsed: creditsNeeded,
      remainingCredits: user.credits - creditsNeeded,
    })
  } catch (error: any) {
    console.error('❌ Error indexing project:', error)
    return NextResponse.json(
      {
        error: 'Indexing failed',
        message: error.message || 'An unexpected error occurred during indexing',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check indexing status
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

    // Count indexed files
    const count = await db.sourceCodeEmbedding.count({
      where: { projectId },
    })

    return NextResponse.json({
      indexed: count > 0,
      fileCount: count,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
