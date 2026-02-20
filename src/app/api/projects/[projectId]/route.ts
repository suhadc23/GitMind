import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'

// DELETE - Remove a project and all related data
export async function DELETE(
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

    // Verify project exists and user has access
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userToProjects: {
          some: { userId },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Delete all related data in correct order (due to foreign key constraints)
    // 1. Delete questions
    await db.question.deleteMany({
      where: { projectId },
    })

    // 2. Delete source code embeddings
    await db.sourceCodeEmbedding.deleteMany({
      where: { projectId },
    })

    // 3. Delete user-to-project relations
    await db.userToProject.deleteMany({
      where: { projectId },
    })

    // 4. Finally delete the project
    await db.project.delete({
      where: { id: projectId },
    })

    console.log(`✅ Project deleted: ${project.name} (${projectId})`)

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error: any) {
    console.error('❌ Error deleting project:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete project',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
