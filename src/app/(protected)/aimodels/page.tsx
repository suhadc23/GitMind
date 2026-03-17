'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  GitBranch,
  Loader2,
  FolderOpen,
  FileCode,
  Plus,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Network,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

interface GraphNodePos {
  id: string
  x: number
  y: number
}

// ─── Language colours ─────────────────────────────────────────────────────────

const LANG_HEX: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#61dafb',
  js: '#f7df1e',
  jsx: '#61dafb',
  py: '#3572A5',
  css: '#563d7c',
  scss: '#c6538c',
  json: '#6b7280',
  md: '#083fa1',
  html: '#e34c26',
  go: '#00ADD8',
  rs: '#dea584',
  vue: '#41b883',
  rb: '#701516',
  java: '#b07219',
  cpp: '#f34b7d',
  sh: '#4EAA25',
  yml: '#cb9820',
  yaml: '#cb9820',
}

function getExt(path: string) {
  return path.split('.').pop()?.toLowerCase() ?? 'other'
}

// ─── Language Breakdown Bar ───────────────────────────────────────────────────

function LanguageBar({ nodes }: { nodes: TreeNode[] }) {
  const files = nodes.filter((n) => n.type === 'blob')
  const counts: Record<string, number> = {}
  files.forEach((f) => {
    const ext = getExt(f.path)
    counts[ext] = (counts[ext] ?? 0) + 1
  })
  const total = files.length
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {sorted.map(([ext, count]) => (
          <div
            key={ext}
            style={{
              width: `${(count / total) * 100}%`,
              backgroundColor: LANG_HEX[ext] ?? '#9ca3af',
            }}
            title={`${ext}: ${count} files (${((count / total) * 100).toFixed(1)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sorted.map(([ext, count]) => (
          <div key={ext} className="flex items-center gap-1 text-xs text-gray-600">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: LANG_HEX[ext] ?? '#9ca3af' }}
            />
            <span>.{ext}</span>
            <span className="text-muted-foreground">
              {((count / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tree View ────────────────────────────────────────────────────────────────

function TreeView({
  nodes,
  onFileClick,
  explanations,
  loadingFile,
}: {
  nodes: TreeNode[]
  onFileClick: (node: TreeNode) => void
  explanations: Record<string, string>
  loadingFile: string | null
}) {
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
        const isExpanded = expanded.has(node.path)
        const isLoadingThis = loadingFile === node.path
        const hasExplanation = !!explanations[node.path]

        return (
          <li key={node.path}>
            <div
              style={{ paddingLeft: `${depth * 1.25}rem` }}
              className="flex items-center gap-1.5 py-0.5 px-2 hover:bg-gray-100 rounded cursor-pointer group"
              onClick={() => {
                if (isDir) {
                  setExpanded((prev) => {
                    const next = new Set(prev)
                    if (next.has(node.path)) next.delete(node.path)
                    else next.add(node.path)
                    return next
                  })
                } else {
                  onFileClick(node)
                }
              }}
            >
              {isDir ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                </>
              ) : (
                <>
                  <div className="w-3 flex-shrink-0" />
                  {isLoadingThis ? (
                    <Loader2 className="h-4 w-4 text-purple-500 flex-shrink-0 animate-spin" />
                  ) : (
                    <FileCode
                      className={`h-4 w-4 flex-shrink-0 ${
                        hasExplanation ? 'text-purple-500' : 'text-blue-500'
                      }`}
                    />
                  )}
                </>
              )}
              <span className={isDir ? 'font-medium text-gray-800' : 'text-gray-600'}>
                {name}
              </span>
              {!isDir && (
                <Sparkles className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 ml-auto transition-opacity" />
              )}
            </div>

            {hasExplanation && (
              <div
                style={{ paddingLeft: `${(depth + 1) * 1.25 + 1.5}rem` }}
                className="pr-2 pb-1"
              >
                <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1.5 border border-purple-100 leading-relaxed">
                  {explanations[node.path]}
                </p>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ─── Dependency Graph ─────────────────────────────────────────────────────────

function DependencyGraph({
  nodes,
  owner,
  repo,
  branch,
}: {
  nodes: TreeNode[]
  owner: string
  repo: string
  branch: string
}) {
  const [graphData, setGraphData] = useState<{
    nodes: GraphNodePos[]
    edges: { source: string; target: string }[]
  } | null>(null)
  const [building, setBuilding] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const sourceFiles = nodes
    .filter((n) => n.type === 'blob' && /\.(ts|tsx|js|jsx|mjs|vue)$/.test(n.path))
    .slice(0, 30)

  const buildGraph = async () => {
    setBuilding(true)
    const allIds = new Set(sourceFiles.map((f) => f.path))
    const adj: Record<string, string[]> = {}

    await Promise.allSettled(
      sourceFiles.map(async (file) => {
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
          )
          if (!res.ok) return
          const text = await res.text()

          const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g
          const resolved: string[] = []
          let m
          while ((m = importRegex.exec(text)) !== null) {
            const imp = m[1]!
            if (!imp.startsWith('.')) continue
            const dir = file.path.split('/').slice(0, -1).join('/')
            const parts = (dir ? `${dir}/${imp}` : imp).split('/')
            const stack: string[] = []
            for (const p of parts) {
              if (p === '..') stack.pop()
              else if (p !== '.') stack.push(p)
            }
            const base = stack.join('/')
            const match = [...allIds].find(
              (id) =>
                id === base ||
                id.startsWith(`${base}.`) ||
                id.startsWith(`${base}/index`),
            )
            if (match) resolved.push(match)
          }
          adj[file.path] = resolved
        } catch {
          // skip unreadable files
        }
      }),
    )

    const W = 560
    const H = 460
    const cx = W / 2
    const cy = H / 2
    const radius = Math.min(cx - 40, cy - 40, 40 + sourceFiles.length * 7)

    const nodeList: GraphNodePos[] = sourceFiles.map((f, i) => {
      const angle = (2 * Math.PI * i) / sourceFiles.length - Math.PI / 2
      return { id: f.path, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
    })

    const edges: { source: string; target: string }[] = []
    for (const [src, targets] of Object.entries(adj)) {
      for (const tgt of targets) {
        edges.push({ source: src, target: tgt })
      }
    }

    setGraphData({ nodes: nodeList, edges })
    setBuilding(false)
  }

  if (!graphData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-muted-foreground">
          Will analyse {sourceFiles.length} source files for import dependencies
        </p>
        <Button onClick={buildGraph} disabled={building}>
          {building ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analysing…
            </>
          ) : (
            <>
              <Network className="h-4 w-4 mr-2" />
              Build Dependency Graph
            </>
          )}
        </Button>
      </div>
    )
  }

  const selectedEdges = selected
    ? graphData.edges.filter((e) => e.source === selected || e.target === selected)
    : []

  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 560 460"
        className="w-full border rounded-lg bg-gray-50"
        style={{ maxHeight: '420px' }}
      >
        {/* Edges */}
        {graphData.edges.map((e, i) => {
          const src = graphData.nodes.find((n) => n.id === e.source)
          const tgt = graphData.nodes.find((n) => n.id === e.target)
          if (!src || !tgt) return null
          const isHighlighted =
            selected !== null && (e.source === selected || e.target === selected)
          const dimmed = selected !== null && !isHighlighted
          return (
            <line
              key={i}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={isHighlighted ? '#7c3aed' : '#d1d5db'}
              strokeWidth={isHighlighted ? 2 : 1}
              strokeOpacity={dimmed ? 0.15 : 0.7}
            />
          )
        })}

        {/* Nodes */}
        {graphData.nodes.map((node) => {
          const name = node.id.split('/').pop() ?? node.id
          const isSelected = selected === node.id
          const isConnected = selectedEdges.some(
            (e) => e.source === node.id || e.target === node.id,
          )
          const dimmed = selected !== null && !isSelected && !isConnected
          const ext = getExt(node.id)

          return (
            <g
              key={node.id}
              onClick={() => setSelected(selected === node.id ? null : node.id)}
              className="cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 9 : 6}
                fill={isSelected ? '#7c3aed' : isConnected ? '#a78bfa' : (LANG_HEX[ext] ?? '#6366f1')}
                opacity={dimmed ? 0.25 : 1}
                stroke={isSelected ? '#5b21b6' : 'none'}
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y + 18}
                textAnchor="middle"
                fontSize={9}
                fill={dimmed ? '#d1d5db' : '#374151'}
                className="select-none pointer-events-none"
              >
                {name.length > 14 ? `${name.slice(0, 12)}…` : name}
              </text>
            </g>
          )
        })}
      </svg>

      {selected && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-gray-700">{selected.split('/').pop()}</span>
          {' '}→ imports{' '}
          <span className="text-purple-700 font-medium">
            {selectedEdges.filter((e) => e.source === selected).length}
          </span>{' '}
          files · imported by{' '}
          <span className="text-purple-700 font-medium">
            {selectedEdges.filter((e) => e.target === selected).length}
          </span>{' '}
          files
        </p>
      )}
      {!selected && (
        <p className="text-xs text-muted-foreground">Click a node to highlight its connections</p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIModelsPage() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState('')
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('')
  const [activeTab, setActiveTab] = useState<'tree' | 'graph'>('tree')

  // AI file explanations
  const [explanations, setExplanations] = useState<Record<string, string>>({})
  const [loadingFile, setLoadingFile] = useState<string | null>(null)

  // Add to project panel
  const [showAddProject, setShowAddProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [creditInfo, setCreditInfo] = useState<{
    fileCount: number
    userCredits: number
  } | null>(null)

  const checkCreditsMutation = api.project.checkCredits.useMutation({
    onSuccess: (data) => setCreditInfo(data),
    onError: () => toast.error('Could not check credits'),
  })

  const createProjectMutation = api.project.createProject.useMutation({
    onSuccess: () => {
      toast.success('Project created! Redirecting…')
      router.push('/dashboard')
    },
    onError: (err) => toast.error(err.message),
  })

  const fetchTree = async () => {
    if (!repoUrl) return
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/)
    if (!match) {
      setError('Invalid GitHub URL')
      return
    }
    const [, ownerVal, rawRepo] = match
    const repoVal = rawRepo!.replace(/\.git$/, '')

    setLoading(true)
    setError(null)
    setTree([])
    setExplanations({})
    setCreditInfo(null)
    setShowAddProject(false)

    try {
      const headers = { Accept: 'application/vnd.github.v3+json' }
      const repoRes = await fetch(`https://api.github.com/repos/${ownerVal}/${repoVal}`, {
        headers,
      })
      if (!repoRes.ok) throw new Error('Repository not found or is private')
      const repoData = await repoRes.json()
      const defaultBranch: string = repoData.default_branch ?? 'main'

      const res = await fetch(
        `https://api.github.com/repos/${ownerVal}/${repoVal}/git/trees/${defaultBranch}?recursive=1`,
        { headers },
      )
      if (!res.ok) throw new Error('Failed to fetch repository tree')
      const data = await res.json()

      setOwner(ownerVal!)
      setRepo(repoVal)
      setBranch(defaultBranch)
      setProjectName(repoVal)
      setTree(data.tree ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const explainFile = async (node: TreeNode) => {
    if (explanations[node.path] || loadingFile) return
    setLoadingFile(node.path)
    try {
      const res = await fetch('/api/explain-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, branch, path: node.path }),
      })
      const data = await res.json()
      if (data.summary) {
        setExplanations((prev) => ({ ...prev, [node.path]: data.summary }))
      }
    } catch {
      toast.error('Could not explain file')
    }
    setLoadingFile(null)
  }

  const handleAddProject = () => {
    setShowAddProject(true)
    const cleanUrl = repoUrl.replace(/\.git$/, '')
    checkCreditsMutation.mutate({ githubUrl: cleanUrl })
  }

  const canAfford =
    creditInfo !== null && creditInfo.userCredits >= creditInfo.fileCount

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
          {/* URL input row */}
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
            {tree.length > 0 && (
              <Button
                variant="outline"
                onClick={handleAddProject}
                className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add to GitMind
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Add to project panel */}
          {showAddProject && tree.length > 0 && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 space-y-3">
              <p className="text-sm font-medium text-purple-900">Add this repo to GitMind</p>
              <Input
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-white"
              />

              {checkCreditsMutation.isPending && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking credits…
                </p>
              )}
              {creditInfo && (
                <p className="text-xs text-purple-800">
                  Costs{' '}
                  <strong>{creditInfo.fileCount} credits</strong> · You have{' '}
                  <strong>{creditInfo.userCredits}</strong>
                  {canAfford ? (
                    <span className="text-green-600 ml-1">✓ Sufficient</span>
                  ) : (
                    <span className="text-red-500 ml-1">✗ Not enough credits</span>
                  )}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={
                    createProjectMutation.isPending ||
                    !projectName ||
                    (creditInfo !== null && !canAfford)
                  }
                  onClick={() =>
                    createProjectMutation.mutate({
                      name: projectName,
                      githubUrl: repoUrl.replace(/\.git$/, ''),
                    })
                  }
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Creating…
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddProject(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Results */}
          {tree.length > 0 && (
            <div className="space-y-3">
              {/* Language breakdown */}
              <LanguageBar nodes={tree} />

              {/* Stats + tab switcher */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {tree.filter((n) => n.type === 'blob').length} files ·{' '}
                  {tree.filter((n) => n.type === 'tree').length} directories
                </p>
                <div className="flex gap-1 border rounded-md p-0.5 bg-gray-50">
                  <button
                    onClick={() => setActiveTab('tree')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      activeTab === 'tree'
                        ? 'bg-white shadow-sm font-medium text-gray-900'
                        : 'text-muted-foreground hover:text-gray-700'
                    }`}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setActiveTab('graph')}
                    className={`px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                      activeTab === 'graph'
                        ? 'bg-white shadow-sm font-medium text-gray-900'
                        : 'text-muted-foreground hover:text-gray-700'
                    }`}
                  >
                    <Network className="h-3 w-3" />
                    Deps Graph
                  </button>
                </div>
              </div>

              {/* Panel */}
              <div className="border rounded-lg bg-gray-50 p-4 max-h-[60vh] overflow-y-auto">
                {activeTab === 'tree' ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      Click any file to get an AI explanation
                    </p>
                    <TreeView
                      nodes={tree}
                      onFileClick={explainFile}
                      explanations={explanations}
                      loadingFile={loadingFile}
                    />
                  </>
                ) : (
                  <DependencyGraph
                    nodes={tree}
                    owner={owner}
                    repo={repo}
                    branch={branch}
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
