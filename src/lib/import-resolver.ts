// Resolve import paths to actual file paths in the project

const JS_TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

// Build a lookup map from file paths for fast resolution
export function buildFileMap(filePaths: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const fp of filePaths) {
    map.set(fp, fp)
    // Also index without extension for import resolution
    for (const ext of JS_TS_EXTENSIONS) {
      if (fp.endsWith(ext)) {
        map.set(fp.slice(0, -ext.length), fp)
      }
    }
    // Index as directory index file
    if (fp.endsWith('/index.ts') || fp.endsWith('/index.tsx') || fp.endsWith('/index.js') || fp.endsWith('/index.jsx')) {
      const dir = fp.substring(0, fp.lastIndexOf('/'))
      map.set(dir, fp)
    }
  }
  return map
}

// Resolve an import source to an actual file path
export function resolveImport(
  importSource: string,
  currentFilePath: string,
  fileMap: Map<string, string>,
  tsConfigPaths?: Record<string, string[]>
): string | null {
  // Skip external packages
  if (!importSource.startsWith('.') && !importSource.startsWith('@/') && !importSource.startsWith('~/')) {
    return null
  }

  // Handle TypeScript path aliases
  if (importSource.startsWith('@/')) {
    const aliasedPath = 'src/' + importSource.slice(2)
    const resolved = fileMap.get(aliasedPath)
    if (resolved) return resolved
    // Try with extensions
    for (const ext of JS_TS_EXTENSIONS) {
      const withExt = fileMap.get(aliasedPath + ext)
      if (withExt) return withExt
    }
    // Try as directory with index
    const asIndex = fileMap.get(aliasedPath + '/index')
    if (asIndex) return asIndex
    return null
  }

  if (importSource.startsWith('~/')) {
    const aliasedPath = importSource.slice(2)
    const resolved = fileMap.get(aliasedPath)
    if (resolved) return resolved
    return null
  }

  // Handle relative imports
  const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
  const parts = importSource.split('/')
  let resolvedDir = currentDir

  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      resolvedDir = resolvedDir.substring(0, resolvedDir.lastIndexOf('/'))
    } else {
      resolvedDir = resolvedDir ? `${resolvedDir}/${part}` : part
    }
  }

  // Try exact match
  const exact = fileMap.get(resolvedDir)
  if (exact) return exact

  // Try with extensions
  for (const ext of JS_TS_EXTENSIONS) {
    const withExt = fileMap.get(resolvedDir + ext)
    if (withExt) return withExt
  }

  // Try as directory index
  const asIndex = fileMap.get(resolvedDir + '/index')
  if (asIndex) return asIndex

  return null
}
