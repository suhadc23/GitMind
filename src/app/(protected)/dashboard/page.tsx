import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/custom/GlassCard'
import { db } from '@/server/db'
import {
  Plus,
  FolderGit2,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Github,
  Star,
  Code2,
  ExternalLink
} from 'lucide-react'

async function getUserStats(clerkId: string, clerkUser: any) {
  // Try to find existing user
  let user = await db.user.findUnique({
    where: { clerkId },
    include: {
      userToProjects: {
        include: {
          project: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 3,
      },
      questions: true,
    },
  })

  // If user doesn't exist, create them
  if (!user) {
    user = await db.user.create({
      data: {
        clerkId: clerkUser.id,
        emailAddress: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        credits: 150,
      },
      include: {
        userToProjects: {
          include: {
            project: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
        questions: true,
      },
    })
  }

  return {
    projectCount: user.userToProjects.length,
    questionCount: user.questions.length,
    credits: user.credits,
    creditsUsed: 150 - user.credits,
    recentProjects: user.userToProjects.map((up) => up.project),
  }
}

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
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const data = await response.json()
    return {
      description: data.description,
      language: data.language,
      stars: data.stargazers_count,
      owner: data.owner.login,
      avatar: data.owner.avatar_url,
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const userStats = await getUserStats(user.id, user)

  // Fetch repo info for recent projects
  const projectsWithInfo = await Promise.all(
    userStats.recentProjects.map(async (project) => ({
      ...project,
      repoInfo: await fetchRepoInfo(project.githubUrl),
    }))
  )

  const stats = [
    {
      label: 'Total Projects',
      value: userStats.projectCount.toString(),
      icon: FolderGit2,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Questions Asked',
      value: userStats.questionCount.toString(),
      icon: Sparkles,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Active This Week',
      value: userStats.projectCount.toString(),
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Credits Remaining',
      value: `${userStats.credits} / 150`,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user.firstName || 'Developer'}!
            </h1>
            <p className="text-emerald-50 text-lg">
              Ready to explore your repositories with AI-powered insights
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link href="/create">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-emerald-600 hover:bg-gray-100 font-semibold"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <GlassCard key={index} className="bg-white border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
          <Link href="/projects">
            <Button variant="ghost" className="text-emerald-600 hover:text-emerald-700">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {projectsWithInfo.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full mb-4">
              <Github className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No projects yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your first GitHub repository to start asking questions and
              getting AI-powered insights about your code.
            </p>
            <Link href="/create">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Project
              </Button>
            </Link>
          </div>
        ) : (
          /* Projects List */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectsWithInfo.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="block"
              >
                <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow hover:border-emerald-300">
                  <div className="flex items-start gap-3">
                    {project.repoInfo?.avatar ? (
                      <img
                        src={project.repoInfo.avatar}
                        alt={project.repoInfo.owner}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
                        <Github className="h-5 w-5 text-emerald-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {project.name}
                        </h4>
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {project.repoInfo?.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {project.repoInfo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {project.repoInfo?.language && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Code2 className="h-3 w-3" />
                            {project.repoInfo.language}
                          </span>
                        )}
                        {project.repoInfo?.stars !== undefined && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Star className="h-3 w-3" />
                            {project.repoInfo.stars.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/create" className="block">
            <div className="flex items-start space-x-4">
              <div className="bg-emerald-500 p-3 rounded-lg">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Add Repository
                </h3>
                <p className="text-sm text-gray-600">
                  Connect a GitHub repo to analyze
                </p>
              </div>
            </div>
          </Link>
        </GlassCard>

        <GlassCard className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/projects" className="block">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Ask a Question
                </h3>
                <p className="text-sm text-gray-600">Query your code with AI</p>
              </div>
            </div>
          </Link>
        </GlassCard>

        <GlassCard className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/billing" className="block">
            <div className="flex items-start space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Upgrade Plan</h3>
                <p className="text-sm text-gray-600">
                  Get more credits and features
                </p>
              </div>
            </div>
          </Link>
        </GlassCard>
      </div>
    </div>
  )
}
