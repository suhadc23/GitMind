// AST-like parser for JS/TS/Python files using regex-based extraction
// (Avoids heavy SWC dependency — works server-side with no native modules)

export interface ParsedImport {
  source: string
  specifiers: string[]
}

export interface ParsedExport {
  name: string
  type: 'function' | 'class' | 'variable' | 'default'
}

export interface ParsedFunction {
  name: string
  startLine: number
  endLine: number
  isAsync: boolean
  isExported: boolean
  calls: string[]
}

export interface ParsedClass {
  name: string
  startLine: number
  endLine: number
  extends?: string
  implements?: string[]
}

export interface ParsedApiRoute {
  method: string
  path?: string
}

export interface ParsedDbQuery {
  model: string
  operation: string
}

export interface ParsedFile {
  imports: ParsedImport[]
  exports: ParsedExport[]
  functions: ParsedFunction[]
  classes: ParsedClass[]
  apiRoutes: ParsedApiRoute[]
  dbQueries: ParsedDbQuery[]
}

// Detect language from file extension
export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    cs: 'csharp',
    cpp: 'cpp', c: 'c', h: 'c',
    vue: 'vue',
    svelte: 'svelte',
  }
  return langMap[ext] || 'unknown'
}

// Detect the architectural layer from file path and content
export function detectLayer(filePath: string, content: string): string {
  const lower = filePath.toLowerCase()

  // API layer
  if (lower.includes('/api/') || lower.includes('/routes/')) return 'API'
  if (/export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/.test(content)) return 'API'

  // UI layer
  if (lower.includes('/components/') || lower.includes('/pages/') || lower.includes('/app/')) {
    if (/['"]use client['"]/.test(content) || /\b(jsx|tsx)\b/.test(filePath) || /<[A-Z]/.test(content)) {
      return 'UI'
    }
  }

  // DB layer
  if (/\b(prisma|@prisma\/client)\b/.test(content) || /\bdb\.\w+\.\w+/.test(content)) return 'DB'

  // LIB layer
  if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/services/') || lower.includes('/helpers/')) return 'LIB'

  // Server layer
  if (lower.includes('/server/')) return 'LIB'

  return 'CONFIG'
}

// Parse JS/TS file
function parseJavaScriptTypeScript(content: string, filePath: string): ParsedFile {
  const lines = content.split('\n')
  const result: ParsedFile = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    apiRoutes: [],
    dbQueries: [],
  }

  // Parse imports
  const importRegex = /import\s+(?:(?:\{([^}]*)\})|(?:(\w+)))\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const specifiers = match[1]
      ? match[1].split(',').map((s) => s.trim().split(' as ')[0]!.trim()).filter(Boolean)
      : match[2]
        ? [match[2]]
        : []
    result.imports.push({ source: match[3]!, specifiers })
  }

  // Also match: import * as X from '...'
  const starImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  while ((match = starImportRegex.exec(content)) !== null) {
    result.imports.push({ source: match[2]!, specifiers: [match[1]!] })
  }

  // Parse exports
  const exportFnRegex = /export\s+(async\s+)?function\s+(\w+)/g
  while ((match = exportFnRegex.exec(content)) !== null) {
    result.exports.push({ name: match[2]!, type: 'function' })
  }

  const exportClassRegex = /export\s+(default\s+)?class\s+(\w+)/g
  while ((match = exportClassRegex.exec(content)) !== null) {
    result.exports.push({ name: match[2]!, type: 'class' })
  }

  const exportConstRegex = /export\s+const\s+(\w+)/g
  while ((match = exportConstRegex.exec(content)) !== null) {
    result.exports.push({ name: match[1]!, type: 'variable' })
  }

  const exportDefaultRegex = /export\s+default\s+(?:function\s+)?(\w+)/g
  while ((match = exportDefaultRegex.exec(content)) !== null) {
    result.exports.push({ name: match[1]!, type: 'default' })
  }

  // Parse functions
  const funcPatterns = [
    /^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*\(/gm,
    /^(\s*)(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*(?:=>|:\s*\w+\s*=>)/gm,
    /^(\s*)(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?function/gm,
  ]

  for (const pattern of funcPatterns) {
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length
      const isExported = !!match[2]
      let name: string
      let isAsync: boolean

      if (pattern === funcPatterns[0]) {
        isAsync = !!match[3]
        name = match[4]!
      } else {
        name = match[3]!
        isAsync = !!match[4]
      }

      // Estimate end line (find matching closing brace)
      const endLine = findBlockEnd(lines, lineNum - 1)

      // Extract function calls within this function
      const funcBody = lines.slice(lineNum - 1, endLine).join('\n')
      const callRegex = /\b(\w+)\s*\(/g
      const calls: string[] = []
      let callMatch
      while ((callMatch = callRegex.exec(funcBody)) !== null) {
        const callName = callMatch[1]!
        if (!['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'throw', 'typeof', 'import', 'export', 'const', 'let', 'var', 'function'].includes(callName)) {
          if (!calls.includes(callName)) calls.push(callName)
        }
      }

      result.functions.push({
        name,
        startLine: lineNum,
        endLine,
        isAsync,
        isExported,
        calls,
      })
    }
  }

  // Parse classes
  const classRegex = /^(\s*)(export\s+)?(default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/gm
  while ((match = classRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length
    const endLine = findBlockEnd(lines, lineNum - 1)

    result.classes.push({
      name: match[4]!,
      startLine: lineNum,
      endLine,
      extends: match[5] || undefined,
      implements: match[6]?.split(',').map((s) => s.trim()).filter(Boolean) || undefined,
    })
  }

  // Detect Next.js API routes
  const routeMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  for (const method of routeMethods) {
    const routeRegex = new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`)
    if (routeRegex.test(content)) {
      result.apiRoutes.push({ method, path: filePath })
    }
  }

  // Detect Prisma DB queries
  const dbQueryRegex = /\bdb\.(\w+)\.(\w+)\s*\(/g
  while ((match = dbQueryRegex.exec(content)) !== null) {
    const entry = { model: match[1]!, operation: match[2]! }
    if (!result.dbQueries.some((q) => q.model === entry.model && q.operation === entry.operation)) {
      result.dbQueries.push(entry)
    }
  }

  // Also detect ctx.db pattern (tRPC)
  const ctxDbRegex = /\bctx\.db\.(\w+)\.(\w+)\s*\(/g
  while ((match = ctxDbRegex.exec(content)) !== null) {
    const entry = { model: match[1]!, operation: match[2]! }
    if (!result.dbQueries.some((q) => q.model === entry.model && q.operation === entry.operation)) {
      result.dbQueries.push(entry)
    }
  }

  return result
}

// Parse Python file
function parsePython(content: string, filePath: string): ParsedFile {
  const lines = content.split('\n')
  const result: ParsedFile = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    apiRoutes: [],
    dbQueries: [],
  }

  let match

  // Parse imports
  const importRegex = /^import\s+(\S+)/gm
  while ((match = importRegex.exec(content)) !== null) {
    result.imports.push({ source: match[1]!, specifiers: [match[1]!] })
  }

  const fromImportRegex = /^from\s+(\S+)\s+import\s+(.+)/gm
  while ((match = fromImportRegex.exec(content)) !== null) {
    const specifiers = match[2]!.split(',').map((s) => s.trim().split(' as ')[0]!.trim()).filter(Boolean)
    result.imports.push({ source: match[1]!, specifiers })
  }

  // Parse functions
  const funcRegex = /^(\s*)(async\s+)?def\s+(\w+)\s*\(/gm
  while ((match = funcRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length
    const indent = match[1]!.length
    const endLine = findPythonBlockEnd(lines, lineNum - 1, indent)

    result.functions.push({
      name: match[3]!,
      startLine: lineNum,
      endLine,
      isAsync: !!match[2],
      isExported: !match[3]!.startsWith('_'),
      calls: [],
    })

    // Functions not starting with _ are considered exports in Python
    if (!match[3]!.startsWith('_')) {
      result.exports.push({ name: match[3]!, type: 'function' })
    }
  }

  // Parse classes
  const classRegex = /^(\s*)class\s+(\w+)(?:\(([^)]*)\))?/gm
  while ((match = classRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length
    const indent = match[1]!.length
    const endLine = findPythonBlockEnd(lines, lineNum - 1, indent)
    const bases = match[3]?.split(',').map((s) => s.trim()).filter(Boolean) || []

    result.classes.push({
      name: match[2]!,
      startLine: lineNum,
      endLine,
      extends: bases[0] || undefined,
    })

    result.exports.push({ name: match[2]!, type: 'class' })
  }

  return result
}

// Find the end of a brace-delimited block in JS/TS
function findBlockEnd(lines: string[], startIdx: number): number {
  let depth = 0
  let foundOpen = false

  for (let i = startIdx; i < lines.length && i < startIdx + 200; i++) {
    const line = lines[i]!
    for (const ch of line) {
      if (ch === '{') {
        depth++
        foundOpen = true
      }
      if (ch === '}') {
        depth--
        if (foundOpen && depth === 0) return i + 1
      }
    }
  }

  return Math.min(startIdx + 20, lines.length)
}

// Find end of indentation-based block in Python
function findPythonBlockEnd(lines: string[], startIdx: number, baseIndent: number): number {
  for (let i = startIdx + 1; i < lines.length && i < startIdx + 200; i++) {
    const line = lines[i]!
    if (line.trim() === '') continue
    const currentIndent = line.length - line.trimStart().length
    if (currentIndent <= baseIndent) return i
  }
  return Math.min(startIdx + 20, lines.length)
}

// Main parse function — dispatches to language-specific parser
export function parseFile(content: string, filePath: string): ParsedFile {
  const lang = detectLanguage(filePath)

  switch (lang) {
    case 'typescript':
    case 'javascript':
    case 'vue':
    case 'svelte':
      return parseJavaScriptTypeScript(content, filePath)
    case 'python':
      return parsePython(content, filePath)
    default:
      // For unsupported languages, return minimal info
      return {
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        apiRoutes: [],
        dbQueries: [],
      }
  }
}
