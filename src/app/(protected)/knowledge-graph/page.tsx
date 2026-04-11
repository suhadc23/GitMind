'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useProject } from '@/hooks/use-project'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Network,
  Loader2,
  Play,
  Search,
  AlertTriangle,
  Target,
  FileCode,
  FunctionSquare,
  Box,
  Globe,
  Database,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Mouse,
  Move,
} from 'lucide-react'
import { toast } from 'sonner'

// ===== Graph Layout Engine =====

const NODE_WIDTH = 220
const NODE_HEIGHT = 64
const H_GAP = 50
const V_GAP = 120
const PADDING = 80

function computeLayout(
  nodes: Array<{ id: string; type: string; layer: string | null }>,
  edges: Array<{ sourceNodeId: string; targetNodeId: string }>
): { positions: Map<string, { x: number; y: number }>; bounds: { width: number; height: number } } {
  const positions = new Map<string, { x: number; y: number }>()

  const layerGroups: Record<string, typeof nodes> = {}
  for (const node of nodes) {
    const layer = node.layer || 'OTHER'
    if (!layerGroups[layer]) layerGroups[layer] = []
    layerGroups[layer]!.push(node)
  }

  const layerOrder = ['API', 'UI', 'LIB', 'DB', 'CONFIG', 'OTHER']

  let currentY = PADDING
  let maxWidth = 0

  for (const layerName of layerOrder) {
    const group = layerGroups[layerName]
    if (!group || group.length === 0) continue

    const totalWidth = group.length * (NODE_WIDTH + H_GAP) - H_GAP
    maxWidth = Math.max(maxWidth, totalWidth)
    const startX = PADDING

    for (let i = 0; i < group.length; i++) {
      positions.set(group[i]!.id, {
        x: startX + i * (NODE_WIDTH + H_GAP),
        y: currentY,
      })
    }

    currentY += NODE_HEIGHT + V_GAP
  }

  return {
    positions,
    bounds: {
      width: maxWidth + PADDING * 2,
      height: currentY + PADDING,
    },
  }
}

// ===== Node type config =====

const NODE_CONFIG: Record<string, { icon: typeof FileCode; color: string }> = {
  FILE: { icon: FileCode, color: 'text-blue-600' },
  FUNCTION: { icon: FunctionSquare, color: 'text-purple-600' },
  CLASS: { icon: Box, color: 'text-amber-600' },
  API_ROUTE: { icon: Globe, color: 'text-green-600' },
  DB_QUERY: { icon: Database, color: 'text-red-600' },
}

const LAYER_COLORS: Record<string, string> = {
  API: '#22c55e',
  UI: '#a855f7',
  DB: '#ef4444',
  LIB: '#6b7280',
  CONFIG: '#f59e0b',
}

// ===== Curved edge path =====

function edgePath(sx: number, sy: number, tx: number, ty: number): string {
  const midY = (sy + ty) / 2
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`
}

// ===== Main Page Component =====

export default function KnowledgeGraphPage() {
  const { projectId, projects, setProjectId } = useProject()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLayer, setSelectedLayer] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showDeadCode, setShowDeadCode] = useState(false)
  const [impactNodeId, setImpactNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Zoom/pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const buildGraph = api.knowledgeGraph.buildGraph.useMutation()
  const { data: graphStatus, refetch: refetchStatus } = api.knowledgeGraph.getGraphStatus.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId,
      refetchInterval: (query) => {
        const d = query.state.data
        return d && 'status' in d && d.status === 'BUILDING' ? 3000 : false
      },
    }
  )

  const filters = useMemo(() => ({
    ...(selectedLayer !== 'all' ? { layers: [selectedLayer] } : {}),
    ...(selectedType !== 'all' ? { nodeTypes: [selectedType] } : {}),
    ...(searchQuery ? { search: searchQuery } : {}),
  }), [selectedLayer, selectedType, searchQuery])

  const { data: graphData, isLoading: graphLoading } = api.knowledgeGraph.getGraph.useQuery(
    { projectId: projectId!, filters: Object.keys(filters).length > 0 ? filters : undefined },
    { enabled: !!projectId && graphStatus?.status === 'COMPLETED' }
  )

  const { data: filterOptions } = api.knowledgeGraph.getFilterOptions.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId && graphStatus?.status === 'COMPLETED' }
  )

  const { data: nodeDetail } = api.knowledgeGraph.getNodeDetail.useQuery(
    { nodeId: selectedNodeId! },
    { enabled: !!selectedNodeId }
  )

  const { data: deadCodeNodes } = api.knowledgeGraph.getDeadCode.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId && showDeadCode }
  )

  const { data: impactData } = api.knowledgeGraph.getImpactAnalysis.useQuery(
    { nodeId: impactNodeId!, depth: 5 },
    { enabled: !!impactNodeId }
  )

  const deadCodeIds = useMemo(() => new Set(deadCodeNodes?.map((n) => n.id) || []), [deadCodeNodes])
  const impactedIds = useMemo(
    () => new Map(impactData?.impactedNodes.map((n) => [n.id, n.distance]) || []),
    [impactData]
  )

  // Connected edges for hover highlight
  const connectedEdgeIds = useMemo(() => {
    if (!hoveredNodeId || !graphData) return new Set<string>()
    return new Set(
      graphData.edges
        .filter((e) => e.sourceNodeId === hoveredNodeId || e.targetNodeId === hoveredNodeId)
        .map((e) => e.id)
    )
  }, [hoveredNodeId, graphData])

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId || !graphData) return new Set<string>()
    const ids = new Set<string>([hoveredNodeId])
    for (const e of graphData.edges) {
      if (e.sourceNodeId === hoveredNodeId) ids.add(e.targetNodeId)
      if (e.targetNodeId === hoveredNodeId) ids.add(e.sourceNodeId)
    }
    return ids
  }, [hoveredNodeId, graphData])

  const handleBuild = async () => {
    if (!projectId) return
    try {
      await buildGraph.mutateAsync({ projectId })
      toast.success('Knowledge graph build started!')
      refetchStatus()
    } catch {
      toast.error('Failed to start graph build')
    }
  }

  // Compute positions and bounds
  const { positions, bounds } = useMemo(() => {
    if (!graphData) return { positions: new Map(), bounds: { width: 0, height: 0 } }
    return computeLayout(graphData.nodes, graphData.edges)
  }, [graphData])

  // Fit graph to view
  const fitToView = useCallback(() => {
    if (!containerRef.current || bounds.width === 0) return
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = rect.width / bounds.width
    const scaleY = rect.height / bounds.height
    const newZoom = Math.min(scaleX, scaleY, 1.5) * 0.9
    const newPanX = (rect.width - bounds.width * newZoom) / 2
    const newPanY = (rect.height - bounds.height * newZoom) / 2
    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [bounds])

  // Auto-fit on first load
  useEffect(() => {
    if (graphData && bounds.width > 0) {
      fitToView()
    }
  }, [graphData, bounds, fitToView])

  // Canvas mouse handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { ...pan }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy })
  }, [isDragging])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  // Wheel zoom toward cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(4, zoom * factor))

    // Zoom toward cursor position
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom)
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom)

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [zoom, pan])

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Network className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Select a Project</h2>
        <p className="text-muted-foreground">Choose a project to build its knowledge graph.</p>
        {projects && projects.length > 0 ? (
          <Select onValueChange={(val: string) => setProjectId(val)}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">No projects yet. Create one first.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header row */}
      <div className="border-b bg-background shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Network className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Knowledge Graph</h1>
              <p className="text-xs text-muted-foreground">Visualize codebase architecture and dependencies</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Repo selector */}
            {projects && projects.length > 0 && (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 w-52 text-sm bg-muted/40">
                  <div className="flex items-center gap-2 truncate">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <SelectValue placeholder="Select repository..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {graphStatus?.status === 'COMPLETED' && (
              <Badge variant="secondary" className="font-mono text-xs">
                {graphStatus.nodesCount} nodes · {graphStatus.edgesCount} edges
              </Badge>
            )}

            <Button
              size="sm"
              onClick={handleBuild}
              disabled={buildGraph.isPending || graphStatus?.status === 'BUILDING'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {graphStatus?.status === 'BUILDING' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Building ({graphStatus.progress}%)
                </>
              ) : graphStatus?.status === 'COMPLETED' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Rebuild
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Build Graph
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Controls row — only when graph is built */}
        {graphStatus?.status === 'COMPLETED' && (
          <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search nodes..."
                  className="pl-8 h-8 w-44 text-sm bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="w-px h-5 bg-border" />

              {/* Filters */}
              <Select value={selectedLayer} onValueChange={setSelectedLayer}>
                <SelectTrigger className="h-8 w-28 text-xs bg-background">
                  <SelectValue placeholder="Layer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Layers</SelectItem>
                  {filterOptions?.layers.map((layer) => (
                    <SelectItem key={layer} value={layer}>{layer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-8 w-28 text-xs bg-background">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {filterOptions?.types.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-5 bg-border" />

              <Button
                size="sm"
                variant={showDeadCode ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => { setShowDeadCode(!showDeadCode); setImpactNodeId(null) }}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Dead Code {deadCodeNodes ? `(${deadCodeNodes.length})` : ''}
              </Button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <div className="flex items-center bg-background border rounded-md">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-r-none" onClick={() => {
                  const newZoom = Math.max(0.1, zoom * 0.8)
                  setPan(p => ({ x: p.x * (newZoom / zoom), y: p.y * (newZoom / zoom) }))
                  setZoom(newZoom)
                }}>
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-xs font-mono w-10 text-center tabular-nums border-x">{Math.round(zoom * 100)}%</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-l-none" onClick={() => {
                  const newZoom = Math.min(4, zoom * 1.25)
                  setPan(p => ({ x: p.x * (newZoom / zoom), y: p.y * (newZoom / zoom) }))
                  setZoom(newZoom)
                }}>
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={fitToView} title="Fit to view">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden bg-[#fafbfc] dark:bg-[#0a0a0f]">
        {graphStatus?.status !== 'COMPLETED' ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            {graphStatus?.status === 'BUILDING' ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                <h2 className="text-xl font-semibold">Building Knowledge Graph...</h2>
                <p className="text-muted-foreground">Parsing files, resolving imports, building edges</p>
                <div className="w-64 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${graphStatus?.progress || 0}%` }}
                  />
                </div>
              </>
            ) : graphStatus?.status === 'FAILED' ? (
              <>
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold">Build Failed</h2>
                <p className="text-muted-foreground">{'error' in graphStatus ? graphStatus.error : 'Unknown error'}</p>
                <Button onClick={handleBuild}>Retry</Button>
              </>
            ) : (
              <>
                <Network className="h-16 w-16 text-muted-foreground/30" />
                <h2 className="text-xl font-semibold">Knowledge Graph Not Built</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Build a knowledge graph to visualize your codebase architecture, detect dead code, and analyze impact.
                </p>
                <Button onClick={handleBuild} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Play className="h-4 w-4 mr-2" />
                  Build Knowledge Graph
                </Button>
              </>
            )}
          </div>
        ) : graphLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : graphData ? (
          <>
            {/* Dot grid background */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                backgroundPosition: `${pan.x % (24 * zoom)}px ${pan.y % (24 * zoom)}px`,
                opacity: 0.4,
              }}
            />

            {/* SVG Graph Canvas */}
            <div
              ref={containerRef}
              className="absolute inset-0 select-none"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <svg
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
              >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Defs */}
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                    </marker>
                    <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
                    </marker>
                    <filter id="node-shadow" x="-10%" y="-10%" width="130%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
                    </filter>
                    <filter id="node-shadow-hover" x="-10%" y="-10%" width="130%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
                    </filter>
                  </defs>

                  {/* Layer labels */}
                  {(() => {
                    const rendered = new Set<number>()
                    return graphData.nodes.map((node) => {
                      const pos = positions.get(node.id)
                      if (!pos) return null
                      const layer = node.layer || 'OTHER'
                      if (rendered.has(pos.y)) return null
                      rendered.add(pos.y)
                      return (
                        <text
                          key={`layer-${layer}-${pos.y}`}
                          x={20}
                          y={pos.y + NODE_HEIGHT / 2}
                          fontSize={11}
                          fontWeight="600"
                          fill={LAYER_COLORS[layer] || '#9ca3af'}
                          opacity={0.6}
                          dominantBaseline="middle"
                          style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        >
                          {layer}
                        </text>
                      )
                    })
                  })()}

                  {/* Edges */}
                  {graphData.edges.map((edge) => {
                    const source = positions.get(edge.sourceNodeId)
                    const target = positions.get(edge.targetNodeId)
                    if (!source || !target) return null

                    const isHighlighted = connectedEdgeIds.has(edge.id)
                    const isDimmed = hoveredNodeId && !isHighlighted

                    return (
                      <path
                        key={edge.id}
                        d={edgePath(
                          source.x + NODE_WIDTH / 2,
                          source.y + NODE_HEIGHT,
                          target.x + NODE_WIDTH / 2,
                          target.y,
                        )}
                        fill="none"
                        stroke={isHighlighted ? '#3b82f6' : '#cbd5e1'}
                        strokeWidth={isHighlighted ? 2 : 1}
                        markerEnd={isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                        opacity={isDimmed ? 0.1 : isHighlighted ? 1 : 0.4}
                        style={{ transition: 'opacity 0.2s, stroke 0.2s, stroke-width 0.2s' }}
                      />
                    )
                  })}

                  {/* Nodes */}
                  {graphData.nodes.map((node) => {
                    const pos = positions.get(node.id)
                    if (!pos) return null

                    const isDead = showDeadCode && deadCodeIds.has(node.id)
                    const impactDist = impactedIds.get(node.id)
                    const isImpacted = impactDist !== undefined
                    const isImpactSource = impactNodeId === node.id
                    const isHovered = hoveredNodeId === node.id
                    const isConnected = connectedNodeIds.has(node.id)
                    const isDimmed = hoveredNodeId && !isConnected
                    const isDimmedDead = showDeadCode && !isDead

                    let borderColor = LAYER_COLORS[node.layer || ''] || '#e2e8f0'
                    if (isDead) borderColor = '#ef4444'
                    if (isImpactSource) borderColor = '#dc2626'
                    if (isImpacted) {
                      borderColor = impactDist === 1 ? '#dc2626' : impactDist === 2 ? '#f97316' : '#fbbf24'
                    }

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className="cursor-pointer"
                        style={{
                          transition: 'opacity 0.2s',
                          opacity: isDimmed ? 0.15 : isDimmedDead ? 0.25 : 1,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedNodeId(node.id)
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setImpactNodeId(node.id)
                          setShowDeadCode(false)
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                      >
                        {/* Card background */}
                        <rect
                          width={NODE_WIDTH}
                          height={NODE_HEIGHT}
                          rx={10}
                          fill="white"
                          stroke={isHovered ? borderColor : borderColor}
                          strokeWidth={isDead || isImpacted || isImpactSource || isHovered ? 2 : 1}
                          filter={isHovered ? 'url(#node-shadow-hover)' : 'url(#node-shadow)'}
                          style={{ transition: 'stroke-width 0.15s' }}
                        />
                        {/* Dark mode overlay rect */}
                        <rect
                          width={NODE_WIDTH}
                          height={NODE_HEIGHT}
                          rx={10}
                          fill="#111827"
                          opacity={0}
                          className="dark:!opacity-100"
                          stroke={borderColor}
                          strokeWidth={isDead || isImpacted || isImpactSource || isHovered ? 2 : 1}
                          filter={isHovered ? 'url(#node-shadow-hover)' : 'url(#node-shadow)'}
                        />

                        {/* Left accent bar */}
                        <rect
                          x={0}
                          y={0}
                          width={4}
                          height={NODE_HEIGHT}
                          rx={2}
                          fill={LAYER_COLORS[node.layer || ''] || '#e2e8f0'}
                          clipPath="inset(0 0 0 0 round 10px 0 0 10px)"
                        />
                        <rect
                          x={0}
                          y={1}
                          width={4}
                          height={NODE_HEIGHT - 2}
                          fill={LAYER_COLORS[node.layer || ''] || '#e2e8f0'}
                        />

                        {/* Node name */}
                        <text x={16} y={26} fontSize={12} fontWeight="600" fill="#1e293b">
                          {node.name.length > 24 ? node.name.slice(0, 24) + '...' : node.name}
                        </text>
                        {/* Dark mode text */}
                        <text x={16} y={26} fontSize={12} fontWeight="600" fill="#e2e8f0" opacity={0} className="dark:!opacity-100">
                          {node.name.length > 24 ? node.name.slice(0, 24) + '...' : node.name}
                        </text>

                        {/* Type + language */}
                        <text x={16} y={46} fontSize={10} fill="#94a3b8">
                          {node.type} · {node.language}
                        </text>

                        {/* Edge count pill */}
                        <rect x={NODE_WIDTH - 58} y={12} width={44} height={18} rx={9} fill="#f1f5f9" />
                        <rect x={NODE_WIDTH - 58} y={12} width={44} height={18} rx={9} fill="#1e293b" opacity={0} className="dark:!opacity-100" />
                        <text x={NODE_WIDTH - 36} y={24} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="monospace">
                          {node._count.inEdges}↑ {node._count.outEdges}↓
                        </text>

                        {isDead && (
                          <g>
                            <rect x={NODE_WIDTH - 50} y={40} width={38} height={16} rx={8} fill="#fef2f2" />
                            <text x={NODE_WIDTH - 31} y={51} fontSize={9} fill="#ef4444" textAnchor="middle" fontWeight="bold">
                              DEAD
                            </text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-md border rounded-xl p-3 text-xs shadow-lg">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(LAYER_COLORS).map(([layer, color]) => (
                  <span key={layer} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-muted-foreground">{layer}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t text-muted-foreground">
                <span className="flex items-center gap-1"><Mouse className="h-3 w-3" /> Scroll to zoom</span>
                <span className="flex items-center gap-1"><Move className="h-3 w-3" /> Drag to pan</span>
                <span>Click for details</span>
              </div>
            </div>

            {/* Minimap */}
            {bounds.width > 0 && containerRef.current && (
              <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-md border rounded-xl shadow-lg overflow-hidden"
                style={{ width: 160, height: 100 }}
              >
                <svg width={160} height={100} viewBox={`0 0 ${bounds.width} ${bounds.height}`} preserveAspectRatio="xMidYMid meet">
                  <rect width={bounds.width} height={bounds.height} fill="transparent" />
                  {graphData.edges.map((edge) => {
                    const source = positions.get(edge.sourceNodeId)
                    const target = positions.get(edge.targetNodeId)
                    if (!source || !target) return null
                    return (
                      <line
                        key={edge.id}
                        x1={source.x + NODE_WIDTH / 2} y1={source.y + NODE_HEIGHT / 2}
                        x2={target.x + NODE_WIDTH / 2} y2={target.y + NODE_HEIGHT / 2}
                        stroke="#cbd5e1" strokeWidth={3} opacity={0.3}
                      />
                    )
                  })}
                  {graphData.nodes.map((node) => {
                    const pos = positions.get(node.id)
                    if (!pos) return null
                    return (
                      <rect
                        key={node.id}
                        x={pos.x} y={pos.y}
                        width={NODE_WIDTH} height={NODE_HEIGHT}
                        rx={4}
                        fill={LAYER_COLORS[node.layer || ''] || '#94a3b8'}
                        opacity={0.6}
                      />
                    )
                  })}
                  {/* Viewport indicator */}
                  {(() => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return null
                    const vx = -pan.x / zoom
                    const vy = -pan.y / zoom
                    const vw = rect.width / zoom
                    const vh = rect.height / zoom
                    return (
                      <rect
                        x={vx} y={vy} width={vw} height={vh}
                        fill="none" stroke="#3b82f6" strokeWidth={Math.max(4, 2 / zoom)}
                        rx={4} opacity={0.8}
                      />
                    )
                  })()}
                </svg>
              </div>
            )}

            {/* Impact analysis info */}
            {impactData && (
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md border rounded-xl p-4 text-sm shadow-lg max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" />
                    Impact Analysis
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setImpactNodeId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{impactData.sourceNode.name}</strong> impacts{' '}
                  <strong className="text-foreground">{impactData.totalImpacted}</strong> nodes
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="flex items-center gap-1 text-xs"><span className="h-2 w-2 rounded-full bg-red-500" />Direct</span>
                  <span className="flex items-center gap-1 text-xs"><span className="h-2 w-2 rounded-full bg-orange-500" />2nd degree</span>
                  <span className="flex items-center gap-1 text-xs"><span className="h-2 w-2 rounded-full bg-yellow-500" />3rd+</span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Node Detail Sheet */}
      <Sheet open={!!selectedNodeId} onOpenChange={(open) => !open && setSelectedNodeId(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          {nodeDetail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = NODE_CONFIG[nodeDetail.type]?.icon || FileCode
                    return <Icon className={`h-5 w-5 ${NODE_CONFIG[nodeDetail.type]?.color || ''}`} />
                  })()}
                  {nodeDetail.name}
                </SheetTitle>
                <SheetDescription>
                  {nodeDetail.filePath}
                  {nodeDetail.startLine && ` (L${nodeDetail.startLine}-${nodeDetail.endLine})`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{nodeDetail.type}</Badge>
                  <Badge variant="outline">{nodeDetail.language}</Badge>
                  {nodeDetail.layer && (
                    <Badge style={{ backgroundColor: LAYER_COLORS[nodeDetail.layer] + '20', color: LAYER_COLORS[nodeDetail.layer] }}>
                      {nodeDetail.layer}
                    </Badge>
                  )}
                  {nodeDetail.lastAuthor && (
                    <Badge variant="secondary">Last: {nodeDetail.lastAuthor}</Badge>
                  )}
                </div>

                {nodeDetail.aiSummary && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">AI Summary</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{nodeDetail.aiSummary}</p>
                  </div>
                )}

                {nodeDetail.outEdges.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Depends On ({nodeDetail.outEdges.length})
                    </h4>
                    <div className="space-y-0.5">
                      {nodeDetail.outEdges.map((edge) => (
                        <button
                          key={edge.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full p-1.5 rounded-md hover:bg-muted transition-colors"
                          onClick={() => setSelectedNodeId(edge.targetNode.id)}
                        >
                          <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate">{edge.targetNode.name}</span>
                          <Badge variant="outline" className="text-[10px] h-4 ml-auto shrink-0">{edge.targetNode.type}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {nodeDetail.inEdges.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Used By ({nodeDetail.inEdges.length})
                    </h4>
                    <div className="space-y-0.5">
                      {nodeDetail.inEdges.map((edge) => (
                        <button
                          key={edge.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full p-1.5 rounded-md hover:bg-muted transition-colors"
                          onClick={() => setSelectedNodeId(edge.sourceNode.id)}
                        >
                          <ArrowLeft className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="truncate">{edge.sourceNode.name}</span>
                          <Badge variant="outline" className="text-[10px] h-4 ml-auto shrink-0">{edge.sourceNode.type}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setImpactNodeId(nodeDetail.id)
                    setSelectedNodeId(null)
                    setShowDeadCode(false)
                  }}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Analyze Impact (Blast Radius)
                </Button>

                {nodeDetail.sourceCode && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Source Code</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-96">
                      <code>
                        {nodeDetail.startLine
                          ? nodeDetail.sourceCode
                              .split('\n')
                              .slice((nodeDetail.startLine || 1) - 1, nodeDetail.endLine || undefined)
                              .join('\n')
                          : nodeDetail.sourceCode.slice(0, 3000)}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
