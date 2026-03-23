import { Document } from '@langchain/core/documents'
import { summarizeCode } from './ai'
import { db } from '@/server/db'
import { Octokit } from 'octokit'

// Parse GitHub URL to extract owner and repo
export function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) {
    throw new Error('Invalid GitHub URL')
  }
  return {
    owner: match[1],
    repo: match[2].replace('.git', ''),
  }
}

// Detect repository's default branch
async function detectDefaultBranch(
  githubUrl: string,
  githubToken?: string
): Promise<string> {
  const { owner, repo } = parseGithubUrl(githubUrl)
  const octokit = new Octokit({
    auth: githubToken || process.env.GITHUB_TOKEN,
  })

  try {
    // Get repository info to find default branch
    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    })

    console.log(`✅ Detected default branch: ${data.default_branch}`)
    return data.default_branch
  } catch (error) {
    console.warn('⚠️ Could not detect default branch, trying fallbacks...')

    // Try common branch names
    const commonBranches = ['main', 'master', 'develop', 'dev']

    for (const branch of commonBranches) {
      try {
        await octokit.rest.repos.getBranch({
          owner,
          repo,
          branch,
        })
        console.log(`✅ Found existing branch: ${branch}`)
        return branch
      } catch {
        continue
      }
    }

    // Default fallback
    console.warn('⚠️ Using fallback branch: main')
    return 'main'
  }
}

const SKIP_PATHS = /\/(node_modules|\.next|dist|build|\.git|coverage|__pycache__|\.pytest_cache)\//i
const SKIP_FILE_NAMES = /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/i

// Load repository files using GitHub tree API — one API call for all paths,
// then parallel-fetch only source files (no LangChain loader needed)
export async function loadGithubRepo(
  githubUrl: string,
  githubToken?: string
): Promise<Document[]> {
  const normalizedUrl = githubUrl.replace(/\.git$/, '')
  console.log('📦 Loading repository:', normalizedUrl)

  const { owner, repo } = parseGithubUrl(normalizedUrl)
  const octokit = new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN })

  const branch = await detectDefaultBranch(normalizedUrl, githubToken)
  console.log(`🌿 Using branch: ${branch}`)

  // 1 API call to get ALL file paths recursively
  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: '1',
  })

  // Filter to only fetchable source/text files
  const candidates = treeData.tree.filter((item) => {
    if (item.type !== 'blob') return false
    const path = item.path ?? ''
    if (SKIP_PATHS.test(`/${path}/`)) return false
    if (SKIP_FILE_NAMES.test(path.split('/').pop() ?? '')) return false
    if ((item.size ?? 0) > 100000) return false // skip files > 100KB
    if (SOURCE_EXT.test(path)) return true       // always include source files
    // include small config/text files too
    if (/\.(json|yaml|yml|md|txt|env|toml|ini|cfg|html|css|scss|less)$/i.test(path)) return true
    return false
  })

  console.log(`📋 Found ${candidates.length} relevant files in tree (from ${treeData.tree.length} total)`)

  // Fetch content in parallel — 20 at a time
  const FETCH_CONCURRENCY = 20
  const docs: Document[] = []

  for (let i = 0; i < candidates.length; i += FETCH_CONCURRENCY) {
    const batch = candidates.slice(i, i + FETCH_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path!,
          ref: branch,
        })
        if ('content' in data && data.encoding === 'base64') {
          const content = Buffer.from(data.content, 'base64').toString('utf8')
          return new Document({
            pageContent: content,
            metadata: { source: item.path },
          })
        }
        return null
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) docs.push(r.value)
    }
  }

  console.log(`✅ Fetched content for ${docs.length} files`)
  return docs
}

// Check file count for credit calculation
export async function checkCredits(
  githubUrl: string,
  githubToken?: string
): Promise<number> {
  const { owner, repo } = parseGithubUrl(githubUrl)
  const octokit = new Octokit({
    auth: githubToken || process.env.GITHUB_TOKEN
  })

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    })

    if (Array.isArray(data)) {
      // Count files recursively
      const count = await countFilesRecursive(octokit, owner, repo, '', 0)
      return count
    }

    return 0
  } catch (error) {
    console.error('❌ Error checking file count:', error)
    return 0
  }
}

// Count files recursively in repository
async function countFilesRecursive(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  acc: number
): Promise<number> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    })

    if (!Array.isArray(data)) {
      return acc + 1
    }

    let fileCount = 0
    const directories: string[] = []

    for (const item of data) {
      if (item.type === 'dir') {
        directories.push(item.path)
      } else if (item.type === 'file') {
        fileCount++
      }
    }

    // Process directories recursively
    for (const dir of directories) {
      fileCount += await countFilesRecursive(octokit, owner, repo, dir, 0)
    }

    return acc + fileCount
  } catch (error) {
    console.error(`❌ Error counting files in ${path}:`, error)
    return acc
  }
}

// File extension classifiers
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|php|swift|kt|cs|cpp|c|h|vue|svelte)$/i
const SKIP_EXT = /\.(lock|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|mp3|wav|pdf|zip|tar|gz|bin|exe)$/i

function shouldSkipFile(fileName: string, content: string): boolean {
  if (SKIP_EXT.test(fileName)) return true          // binary / lock files
  if (content.length < 50) return true              // empty / trivial
  if (content.length > 100000) return true          // over 100KB
  return false
}

function autoSummary(fileName: string): string {
  const name = fileName.split('/').pop() ?? fileName
  return `Configuration/data file: ${name}`
}

// Strip null bytes — PostgreSQL rejects 0x00 in text columns
const sanitize = (s: string) => s.replace(/\x00/g, '')

// Generate summaries — AI only for source code, instant for config files
async function generateSummaries(docs: Document[]) {
  console.log(`📝 Processing ${docs.length} files...`)

  // Split into source (needs AI) vs config (instant)
  const sourceDocs: Document[] = []
  const configDocs: Document[] = []

  for (const doc of docs) {
    const fileName = doc.metadata.source ?? ''
    if (shouldSkipFile(fileName, doc.pageContent)) continue
    if (SOURCE_EXT.test(fileName)) {
      sourceDocs.push(doc)
    } else {
      configDocs.push(doc)
    }
  }

  console.log(`   🔵 Source files (AI summary): ${sourceDocs.length}`)
  console.log(`   ⚪ Config files (instant):    ${configDocs.length}`)

  // Config files — no AI, instant
  const configResults = configDocs.map((doc) => ({
    summary: autoSummary(doc.metadata.source ?? ''),
    sourceCode: sanitize(doc.pageContent).slice(0, 20000),
    fileName: doc.metadata.source ?? '',
  }))

  // Source files — AI summaries in parallel batches of 20
  const BATCH_SIZE = 20
  const sourceResults: Array<{ summary: string; sourceCode: string; fileName: string }> = []

  for (let i = 0; i < sourceDocs.length; i += BATCH_SIZE) {
    const batch = sourceDocs.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(sourceDocs.length / BATCH_SIZE)
    console.log(`   Summarizing batch ${batchNum}/${totalBatches} (${batch.length} files)...`)

    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        try {
          const clean = sanitize(doc.pageContent)
          const code = clean.slice(0, 5000)
          const summary = await summarizeCode(code, doc.metadata.source ?? '')
          if (!summary) return null
          return {
            summary,
            sourceCode: clean.slice(0, 20000),
            fileName: doc.metadata.source ?? '',
          }
        } catch {
          return null
        }
      })
    )

    sourceResults.push(...(batchResults.filter(Boolean) as typeof sourceResults))
  }

  const all = [...sourceResults, ...configResults]
  console.log(`✅ Indexed ${all.length} files (${sourceResults.length} with AI summaries, ${configResults.length} config)`)
  return all
}

// Main indexing function (SIMPLIFIED - No Vector Embeddings)
export async function indexGithubRepo(
  projectId: string,
  githubUrl: string,
  githubToken?: string
) {
  const githubUrlClean = githubUrl.replace(/\.git$/, '')
  console.log('🚀 Starting indexing for project:', projectId)
  console.log('📍 Repository:', githubUrlClean)

  // Step 1: Load repository files
  const docs = await loadGithubRepo(githubUrlClean, githubToken)

  if (docs.length === 0) {
    throw new Error('No files found in repository')
  }

  console.log(`📊 Loaded ${docs.length} files — indexing all of them`)

  // Clear previous indexing so stale files don't pollute search results
  await db.sourceCodeEmbedding.deleteMany({ where: { projectId } })
  console.log(`🗑️  Cleared previous index for project ${projectId}`)

  // Step 2: Generate summaries (AI for source files, instant for config)
  const summaries = await generateSummaries(docs)

  if (summaries.length === 0) {
    throw new Error('Failed to generate any summaries')
  }

  // Step 3: Batch insert into DB — one query instead of N
  console.log(`💾 Storing ${summaries.length} files in database...`)

  await db.sourceCodeEmbedding.createMany({
    data: summaries.map((item) => ({
      summary: item.summary,
      sourceCode: item.sourceCode,
      fileName: item.fileName,
      projectId,
    })),
  })

  console.log(`✅ Successfully indexed ${summaries.length} files`)

  return {
    indexed: summaries.length,
    total: docs.length,
  }
}
