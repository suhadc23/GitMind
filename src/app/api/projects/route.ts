import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'

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

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create the user in database
    const user = await getOrCreateUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to get user information' },
        { status: 500 }
      )
    }

    // Get all projects for this user
    const userProjects = await db.userToProject.findMany({
      where: {
        userId: user.id,
      },
      include: {
        project: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fetch GitHub info for each project
    const projectsWithInfo = await Promise.all(
      userProjects.map(async (up) => {
        try {
          // Extract owner/repo from GitHub URL
          const match = up.project.githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
          if (!match) {
            return {
              id: up.project.id,
              name: up.project.name,
              githubUrl: up.project.githubUrl,
              createdAt: up.project.createdAt,
              repoInfo: null,
            }
          }

          const [, owner, repo] = match
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'GitMind-App',
            },
            next: { revalidate: 60 }, // Cache for 60 seconds
          })

          if (!response.ok) {
            return {
              id: up.project.id,
              name: up.project.name,
              githubUrl: up.project.githubUrl,
              createdAt: up.project.createdAt,
              repoInfo: null,
            }
          }

          const repoInfo = await response.json()

          return {
            id: up.project.id,
            name: up.project.name,
            githubUrl: up.project.githubUrl,
            createdAt: up.project.createdAt,
            repoInfo: {
              description: repoInfo.description,
              language: repoInfo.language,
              stars: repoInfo.stargazers_count,
              forks: repoInfo.forks_count,
              owner: repoInfo.owner.login,
              avatar: repoInfo.owner.avatar_url,
              updatedAt: repoInfo.updated_at,
            },
          }
        } catch {
          return {
            id: up.project.id,
            name: up.project.name,
            githubUrl: up.project.githubUrl,
            createdAt: up.project.createdAt,
            repoInfo: null,
          }
        }
      })
    )

    return NextResponse.json({ projects: projectsWithInfo })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
