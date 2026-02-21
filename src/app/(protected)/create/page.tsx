'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/trpc/react'
import { useRefetch } from '@/hooks/use-refetch'
import { toast } from 'sonner'
import { Github, Loader2, Info, CheckCircle2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Project name is required'),
  githubUrl: z.string().url('Must be a valid URL').includes('github.com', {
    message: 'Must be a GitHub URL',
  }),
  githubToken: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CreateProjectPage() {
  const router = useRouter()
  const refetch = useRefetch()
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [userCredits, setUserCredits] = useState<number | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', githubUrl: '', githubToken: '' },
  })

  const checkCredits = api.project.checkCredits.useMutation()
  const createProject = api.project.createProject.useMutation()

  const githubUrl = watch('githubUrl')

  const handleCheckCredits = async () => {
    if (!githubUrl || !githubUrl.includes('github.com')) return
    const result = await checkCredits.mutateAsync({
      githubUrl,
      githubToken: watch('githubToken'),
    })
    setFileCount(result.fileCount)
    setUserCredits(result.userCredits)
  }

  const onSubmit = async (data: FormValues) => {
    if (fileCount !== null && userCredits !== null && userCredits < fileCount) {
      toast.error(`Not enough credits. Need ${fileCount}, have ${userCredits}.`)
      return
    }

    createProject.mutate(
      {
        name: data.name,
        githubUrl: data.githubUrl,
        githubToken: data.githubToken,
      },
      {
        onSuccess: async () => {
          toast.success('Project created successfully!')
          await refetch()
          router.push('/dashboard')
        },
        onError: (err) => {
          toast.error(err.message)
        },
      }
    )
  }

  const hasEnoughCredits = fileCount === null || userCredits === null || userCredits >= fileCount

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect a GitHub repository to start exploring with AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Link GitHub Repository
          </CardTitle>
          <CardDescription>
            Enter the details of the repository you want to analyse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Project Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                {...register('name')}
                placeholder="My Awesome Project"
                disabled={createProject.isPending}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* GitHub URL */}
            <div className="space-y-1">
              <label className="text-sm font-medium">GitHub URL</label>
              <Input
                {...register('githubUrl')}
                placeholder="https://github.com/owner/repo"
                disabled={createProject.isPending}
              />
              {errors.githubUrl && (
                <p className="text-xs text-destructive">{errors.githubUrl.message}</p>
              )}
            </div>

            {/* GitHub Token (optional) */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                GitHub Token{' '}
                <span className="text-muted-foreground font-normal">(optional, for private repos)</span>
              </label>
              <Input
                {...register('githubToken')}
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                disabled={createProject.isPending}
              />
            </div>

            {/* Credit Check Result */}
            {fileCount !== null && userCredits !== null && (
              <div className={`rounded-lg p-4 border flex items-start gap-3 ${
                hasEnoughCredits
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {hasEnoughCredits ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className={hasEnoughCredits ? 'text-emerald-800' : 'text-red-800'}>
                    This repo will cost <strong>{fileCount} credits</strong>.
                    You have <strong>{userCredits} credits</strong>.
                  </p>
                  {!hasEnoughCredits && (
                    <p className="text-red-700 mt-1">
                      You need {fileCount - userCredits} more credits.{' '}
                      <a href="/billing" className="underline font-medium">Buy more credits</a>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {/* Check Credits Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckCredits}
                disabled={checkCredits.isPending || !githubUrl?.includes('github.com')}
                className="gap-2"
              >
                {checkCredits.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                Check Credits
              </Button>

              {/* Create Button */}
              <Button
                type="submit"
                disabled={createProject.isPending || !hasEnoughCredits}
                className="flex-1 gap-2"
              >
                {createProject.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating & Indexing...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          How it works
        </h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• 1 credit is deducted per file indexed</li>
          <li>• Click "Check Credits" to see how many credits this repo requires</li>
          <li>• Indexing happens automatically after project creation</li>
          <li>• You start with 10,000 free credits</li>
        </ul>
      </div>
    </div>
  )
}
