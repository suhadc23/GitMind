import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'

// Get or create user in database
async function getOrCreateUser(clerkId: string) {
  // Try to find existing user
  let user = await db.user.findUnique({
    where: { clerkId },
  })

  // If user doesn't exist, create them from Clerk data
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

// Parse GitHub URL to extract owner and repo
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
      /github\.com\/([^\/]+)\/([^\/]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') }
      }
    }
    return null
  } catch {
    return null
  }
}

// Fetch repository info from GitHub API
async function fetchGitHubRepo(owner: string, repo: string) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitMind-App',
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found. Make sure it exists and is public.')
    }
    throw new Error('Failed to fetch repository information')
  }

  return response.json()
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { githubUrl } = body

    if (!githubUrl) {
      return NextResponse.json(
        { error: 'GitHub URL is required' },
        { status: 400 }
      )
    }

    // Parse the GitHub URL
    const parsed = parseGitHubUrl(githubUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL format' },
        { status: 400 }
      )
    }

    // Fetch repo info from GitHub
    const repoInfo = await fetchGitHubRepo(parsed.owner, parsed.repo)

    // Get or create the user in database
    const user = await getOrCreateUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to get user information' },
        { status: 500 }
      )
    }

    // Check if project already exists for this user
    const existingProject = await db.project.findFirst({
      where: {
        githubUrl: repoInfo.html_url,
        userToProjects: {
          some: {
            userId: user.id,
          },
        },
      },
    })

    if (existingProject) {
      return NextResponse.json(
        { error: 'This repository is already added to your projects' },
        { status: 409 }
      )
    }

    // Create the project and link to user
    const project = await db.project.create({
      data: {
        name: repoInfo.name,
        githubUrl: repoInfo.html_url,
        userToProjects: {
          create: {
            userId: user.id,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        githubUrl: project.githubUrl,
        repoInfo: {
          description: repoInfo.description,
          language: repoInfo.language,
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
          owner: repoInfo.owner.login,
          avatar: repoInfo.owner.avatar_url,
        },
      },
    })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    )
  }
}
