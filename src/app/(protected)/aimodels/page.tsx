'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GitBranch, Loader2, FolderOpen, FileCode } from 'lucide-react'

interface TreeNode {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

function TreeView({ nodes, prefix = '' }: { nodes: TreeNode[]; prefix?: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const filtered = nodes.filter((n) => {
    const parts = n.path.split('/')
    if (parts.length === 1) return true
    const parent = parts.slice(0, -1).join('/')
    return expanded.has(parent)
  })

  return (
    <ul className="space-y-0.5 font-mono text-sm">
      {filtered.map((node) => {
        const depth = node.path.split('/').length - 1
        const name = node.path.split('/').pop() ?? node.path
        const isDir = node.type === 'tree'

        return (
          <li
            key={node.path}
            style={{ paddingLeft: `${depth * 1.25}rem` }}
            className="flex items-center gap-1.5 py-0.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              if (isDir) {
                setExpanded((prev) => {
                  const next = new Set(prev)
                  if (next.has(node.path)) next.delete(node.path)
                  else next.add(node.path)
                  return next
                })
              }
            }}
          >
            {isDir ? (
              <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <FileCode className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
            <span className={isDir ? 'font-medium text-gray-800' : 'text-gray-600'}>
              {name}
            </span>
            {node.size && (
              <span className="ml-auto text-xs text-muted-foreground">
                {(node.size / 1024).toFixed(1)}KB
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function AIModelsPage() {
  const [repoUrl, setRepoUrl] = useState('')
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTree = async () => {
    if (!repoUrl) return
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      setError('Invalid GitHub URL')
      return
    }
    const [, owner, repo] = match
    setLoading(true)
    setError(null)
    setTree([])

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      )
      if (!res.ok) throw new Error('Failed to fetch repository tree')
      const data = await res.json()
      setTree(data.tree ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GitHub Tree Viewer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore the file structure of any public GitHub repository
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-5 w-5 text-emerald-500" />
            Repository Explorer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTree()}
            />
            <Button onClick={fetchTree} disabled={loading || !repoUrl}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {tree.length > 0 && (
            <div className="border rounded-lg bg-gray-50 p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">
                {tree.filter((n) => n.type === 'blob').length} files,{' '}
                {tree.filter((n) => n.type === 'tree').length} directories
              </p>
              <TreeView nodes={tree} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
