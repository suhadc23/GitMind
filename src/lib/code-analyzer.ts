export interface FileAnalysis {
  fileName: string
  lines: number
  todoCount: number
  fixmeCount: number
  hackCount: number
  consoleLogCount: number
  magicNumberCount: number
  hasErrorHandling: boolean
  commentDensity: number
  isLargeFile: boolean
  score: number
  issues: string[]
}

export function countTodos(code: string): { todos: number; fixmes: number; hacks: number } {
  const todos = (code.match(/\bTODO\b/gi) ?? []).length
  const fixmes = (code.match(/\bFIXME\b/gi) ?? []).length
  const hacks = (code.match(/\bHACK\b|\bXXX\b/gi) ?? []).length
  return { todos, fixmes, hacks }
}

export function countConsoleLogs(code: string): number {
  return (code.match(/console\.(log|warn|error|debug|info)\s*\(/g) ?? []).length
}

export function countMagicNumbers(code: string): number {
  const lines = code.split('\n')
  let count = 0
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip comments and imports
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import') ||
      trimmed.startsWith('require') ||
      trimmed.startsWith('export')
    ) continue
    // Count numbers >= 100 not immediately preceded/followed by letters (variable names)
    const matches = trimmed.match(/(?<![a-zA-Z_$'"])\b([1-9][0-9]{2,})\b(?![a-zA-Z_$'"])/g)
    if (matches) count += matches.length
  }
  return count
}

export function checkErrorHandling(code: string): boolean {
  return /try\s*\{|\.catch\s*\(|catch\s*\(error|catch\s*\(err|Promise\.reject/.test(code)
}

export function computeCommentDensity(code: string): number {
  const lines = code.split('\n')
  if (lines.length === 0) return 0
  const commentLines = lines.filter((l) => {
    const t = l.trim()
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/')
  }).length
  return commentLines / lines.length
}

export function analyzeFile(fileName: string, sourceCode: string): FileAnalysis {
  const lines = sourceCode.split('\n').length
  const { todos, fixmes, hacks } = countTodos(sourceCode)
  const consoleLogCount = countConsoleLogs(sourceCode)
  const magicNumberCount = countMagicNumbers(sourceCode)
  const hasError = checkErrorHandling(sourceCode)
  const density = computeCommentDensity(sourceCode)
  const isLarge = lines > 300

  const issues: string[] = []
  if (todos > 0) issues.push(`${todos} TODO${todos > 1 ? 's' : ''}`)
  if (fixmes > 0) issues.push(`${fixmes} FIXME${fixmes > 1 ? 's' : ''}`)
  if (hacks > 0) issues.push(`${hacks} HACK${hacks > 1 ? 's' : ''}`)
  if (consoleLogCount > 2) issues.push(`${consoleLogCount} console.log calls`)
  if (isLarge) issues.push(`Large file (${lines} lines)`)
  if (!hasError) issues.push('No error handling')

  // Individual file score (0-100)
  let score = 100
  score -= Math.min(todos * 3, 12)
  score -= Math.min(fixmes * 5, 15)
  score -= Math.min(hacks * 3, 9)
  score -= Math.min(consoleLogCount * 2, 10)
  score -= Math.min(magicNumberCount, 8)
  if (isLarge) score -= 10
  if (!hasError) score -= 8
  if (density < 0.02) score -= 5
  score = Math.max(0, Math.round(score))

  return {
    fileName,
    lines,
    todoCount: todos,
    fixmeCount: fixmes,
    hackCount: hacks,
    consoleLogCount,
    magicNumberCount,
    hasErrorHandling: hasError,
    commentDensity: density,
    isLargeFile: isLarge,
    score,
    issues,
  }
}

export function computeCleanlinessScore(analyses: FileAnalysis[]): number {
  if (analyses.length === 0) return 100
  const totalTodos = analyses.reduce((s, a) => s + a.todoCount, 0)
  const totalFixmes = analyses.reduce((s, a) => s + a.fixmeCount, 0)
  const totalHacks = analyses.reduce((s, a) => s + a.hackCount, 0)
  const totalLogs = analyses.reduce((s, a) => s + a.consoleLogCount, 0)
  const totalMagic = analyses.reduce((s, a) => s + a.magicNumberCount, 0)

  let score = 100
  score -= Math.min(totalTodos * 2, 20)
  score -= Math.min(totalFixmes * 3, 15)
  score -= Math.min(totalHacks * 2, 10)
  score -= Math.min(totalLogs, 15)
  score -= Math.min(Math.floor(totalMagic * 0.5), 10)
  return Math.max(0, Math.round(score))
}

export function computeOrganizationScore(analyses: FileAnalysis[]): number {
  if (analyses.length === 0) return 100
  const largeFiles = analyses.filter((a) => a.isLargeFile).length
  const avgLines = analyses.reduce((s, a) => s + a.lines, 0) / analyses.length

  let score = 100
  score -= Math.min(largeFiles * 5, 25)
  if (avgLines > 200) score -= 10
  if (avgLines > 400) score -= 10
  return Math.max(0, Math.round(score))
}
