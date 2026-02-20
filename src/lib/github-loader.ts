import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github'
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

// Load repository files using LangChain
export async function loadGithubRepo(
  githubUrl: string,
  githubToken?: string
): Promise<Document[]> {
  console.log('📦 Loading repository:', githubUrl)

  // Detect the default branch dynamically
  const branch = await detectDefaultBranch(githubUrl, githubToken)
  console.log(`🌿 Using branch: ${branch}`)

  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || process.env.GITHUB_TOKEN || '',
    branch: branch,
    ignoreFiles: [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'bun.lockb',
      '.next',
      'node_modules',
      '.git',
      'dist',
      'build',
    ],
    recursive: true,
    unknown: 'warn',
    maxConcurrency: 5,
  })

  try {
    const docs = await loader.load()
    console.log(`✅ Loaded ${docs.length} files from repository`)
    return docs
  } catch (error) {
    console.error('❌ Error loading repository:', error)
    throw new Error('Failed to load repository. Check URL and access permissions.')
  }
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

// Generate summaries for documents (simplified - no embeddings)
async function generateSummaries(docs: Document[]) {
  console.log(`📝 Generating summaries for ${docs.length} files...`)

  // Process in batches of 5 for better parallelization
  const batchSize = 5
  const summaries: any[] = []

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(docs.length / batchSize)}`)

    const batchResults = await Promise.all(
      batch.map(async (doc, batchIndex) => {
        const globalIndex = i + batchIndex
        try {
          console.log(`   [${globalIndex + 1}/${docs.length}] ${doc.metadata.source}`)

          // Skip very large files (>50KB) for faster processing
          if (doc.pageContent.length > 50000) {
            console.log(`   ⏭️  Skipping large file: ${doc.metadata.source}`)
            return null
          }

          // Limit code to 5k characters for faster processing
          const code = doc.pageContent.slice(0, 5000)
          const summary = await summarizeCode(code, doc.metadata.source)

          if (!summary) {
            console.warn(`   ⚠️ No summary generated for ${doc.metadata.source}`)
            return null
          }

          return {
            summary,
            sourceCode: doc.pageContent.slice(0, 20000), // Store max 20KB
            fileName: doc.metadata.source,
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${doc.metadata.source}:`, error)
          return null
        }
      })
    )

    summaries.push(...batchResults)
  }

  const validSummaries = summaries.filter((s) => s !== null)
  console.log(`✅ Successfully generated ${validSummaries.length} summaries`)

  return validSummaries
}

// Main indexing function (SIMPLIFIED - No Vector Embeddings)
export async function indexGithubRepo(
  projectId: string,
  githubUrl: string,
  githubToken?: string
) {
  console.log('🚀 Starting indexing for project:', projectId)
  console.log('📍 Repository:', githubUrl)

  // Step 1: Load repository files
  const docs = await loadGithubRepo(githubUrl, githubToken)

  if (docs.length === 0) {
    throw new Error('No files found in repository')
  }

  // Limit to 10 files for faster processing (demo purposes)
  const limitedDocs = docs.slice(0, 10)
  console.log(`📊 Processing ${limitedDocs.length} files (limited for demo - faster indexing)`)

  // Step 2: Generate summaries (no embeddings in simplified version)
  const summaries = await generateSummaries(limitedDocs)

  if (summaries.length === 0) {
    throw new Error('Failed to generate any summaries')
  }

  // Step 3: Store in database (text only, no vectors)
  console.log('💾 Storing summaries in database...')

  const results = await Promise.allSettled(
    summaries.map(async (item) => {
      if (!item) return null

      return await db.sourceCodeEmbedding.create({
        data: {
          summary: item.summary,
          sourceCode: item.sourceCode,
          fileName: item.fileName,
          projectId,
        },
      })
    })
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  console.log(`✅ Successfully indexed ${successful}/${summaries.length} files`)

  return {
    indexed: successful,
    total: docs.length,
    limited: limitedDocs.length,
  }
}
