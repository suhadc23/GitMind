import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Github } from 'lucide-react'

export default async function ProjectsPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            Manage all your connected GitHub repositories
          </p>
        </div>
        <Link href="/create">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full mb-6">
            <Github className="h-12 w-12 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            No projects yet
          </h3>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Get started by connecting your first GitHub repository. Once connected, you'll be able to ask questions and get AI-powered insights about your code.
          </p>
          <Link href="/create">
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
