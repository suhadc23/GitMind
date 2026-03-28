import { Octokit } from 'octokit'
import { parseGithubUrl } from './github-loader'

function getOctokit(githubToken?: string) {
  return new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN })
}

export interface PRListItem {
  number: number
  title: string
  body: string | null
  authorLogin: string
  authorAvatarUrl: string
  baseBranch: string
  headBranch: string
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

export interface PRFileItem {
  filename: string
  status: string
  additions: number
  deletions: number
  patch: string | null
}

// List open PRs for a repository
export async function fetchOpenPRs(
  githubUrl: string,
  githubToken?: string
): Promise<PRListItem[]> {
  const { owner, repo } = parseGithubUrl(githubUrl)
  const octokit = getOctokit(githubToken)

  const { data } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    per_page: 30,
    sort: 'updated',
    direction: 'desc',
  })

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    body: pr.body,
    authorLogin: pr.user?.login ?? 'unknown',
    authorAvatarUrl: pr.user?.avatar_url ?? '',
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    htmlUrl: pr.html_url,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
  }))
}

// Get single PR detail
export async function fetchPRDetail(
  githubUrl: string,
  prNumber: number,
  githubToken?: string
) {
  const { owner, repo } = parseGithubUrl(githubUrl)
  const octokit = getOctokit(githubToken)

  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  })

  return {
    number: data.number,
    title: data.title,
    body: data.body,
    authorLogin: data.user?.login ?? 'unknown',
    authorAvatarUrl: data.user?.avatar_url ?? '',
    baseBranch: data.base.ref,
    headBranch: data.head.ref,
    htmlUrl: data.html_url,
  }
}

// Get all files changed in a PR with their diffs
export async function fetchPRFiles(
  githubUrl: string,
  prNumber: number,
  githubToken?: string
): Promise<PRFileItem[]> {
  const { owner, repo } = parseGithubUrl(githubUrl)
  const octokit = getOctokit(githubToken)

  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  })

  return data.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ?? null,
  }))
}

// Get full unified diff for AI summarization
export async function fetchFullDiff(
  githubUrl: string,
  prNumber: number,
  githubToken?: string
): Promise<string> {
  const { owner, repo } = parseGithubUrl(githubUrl)
  const octokit = getOctokit(githubToken)

  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' },
  })

  return data as unknown as string
}

// Parse a unified diff patch into old/new code for side-by-side viewer
export function parsePatchToSides(patch: string | null): {
  oldCode: string
  newCode: string
} {
  if (!patch) return { oldCode: '', newCode: '' }

  const lines = patch.split('\n')
  const oldLines: string[] = []
  const newLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Hunk header — add as context
      oldLines.push(line)
      newLines.push(line)
    } else if (line.startsWith('-')) {
      oldLines.push(line.substring(1))
    } else if (line.startsWith('+')) {
      newLines.push(line.substring(1))
    } else {
      // Context line (starts with space or is empty)
      const content = line.startsWith(' ') ? line.substring(1) : line
      oldLines.push(content)
      newLines.push(content)
    }
  }

  return {
    oldCode: oldLines.join('\n'),
    newCode: newLines.join('\n'),
  }
}
