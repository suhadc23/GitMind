# FULL IMPLEMENTATION PLAN - 100% Phase 1 & Phase 2
## Target: 40% Project Completion with Full Vector Search

---

## ⏰ **TIME ASSESSMENT**

**Total Estimated Time: 16-19 hours**
- Phase 1 (Quick Wins): 3-4 hours
- Phase 2 (Full Vector Search): 13-15 hours
- **Total: 16-19 hours**

**Feasibility: POSSIBLE** if you:
- Start immediately
- Work focused (no distractions)
- Take breaks strategically
- Have 18+ hours available

**Timeline:**
- **Start:** Now (assume 2 PM)
- **Phase 1 Complete:** 6 PM (4 hours)
- **Dinner Break:** 6-7 PM
- **Phase 2 Part 1 (Setup):** 7-11 PM (4 hours)
- **Short Break:** 11-11:30 PM
- **Phase 2 Part 2 (Implementation):** 11:30 PM - 3 AM (3.5 hours)
- **Sleep:** 3-7 AM (4 hours)
- **Phase 2 Part 3 (Testing):** 7-10 AM (3 hours)
- **Final Polish:** 10-11 AM
- **Exam Ready:** 11 AM ✅

---

## 📊 **WHAT YOU'LL ACHIEVE**

### Current: 28%

### After Phase 1: 32% (+4%)
- ✅ Enhanced navbar with dropdowns
- ✅ Polished dashboard with all cards
- ✅ Loading states everywhere
- ✅ Better UX overall

### After Phase 2: 42% (+10%)
- ✅ pgvector extension installed
- ✅ Full GitHub repository indexing
- ✅ LangChain integration
- ✅ Vector embeddings (768-dim)
- ✅ RAG system with similarity search
- ✅ AI answers based on actual code
- ✅ Streaming responses
- ✅ Code references with syntax highlighting

### **Final: 42% Complete** ✅
**(Exceeds 40% target!)**

---

## 🎯 **PHASE 1: QUICK WINS (3-4 hours)**

### **Goal:** Polish existing features to production quality

---

### **TASK 1.1: Enhanced Navbar (1.5 hours)**

**File:** `/src/components/layout/Navbar.tsx`

**What to implement:**
1. Product dropdown menu with 2 columns
2. Solutions dropdown
3. Pricing link
4. Responsive mobile menu
5. Smooth hover animations

**Code Pattern (from reference):**

```typescript
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b bg-white/70 px-8 py-6 shadow-md backdrop-blur-md">
      <div className="flex items-center">
        <Link href="/" className="flex items-center text-2xl font-bold">
          <span className="mr-2 text-3xl text-emerald-600">&#60;&#47;&#62;</span>
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            GitMind
          </span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <nav className="relative hidden space-x-10 text-lg md:flex">
        <Link href="/" className="text-gray-700 hover:text-gray-900 transition-all">
          Home
        </Link>

        {/* Product Dropdown */}
        <div className="group relative">
          <button className="text-gray-700 hover:text-gray-900 transition-all">
            Product
          </button>
          <div className="absolute left-0 top-full mt-4 hidden w-[500px] rounded-lg border bg-white shadow-lg group-hover:block">
            <div className="flex w-full">
              <div className="w-1/2 border-r p-4">
                <h3 className="mb-2 text-base font-semibold text-emerald-600">
                  Platform
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><Link href="#">AI-Powered Code Analysis</Link></li>
                  <li><Link href="#">Intelligent Code Search</Link></li>
                  <li><Link href="#">Repository Understanding</Link></li>
                  <li><Link href="#">Commit Tracking</Link></li>
                </ul>
              </div>
              <div className="w-1/2 p-4">
                <h3 className="mb-2 text-base font-semibold text-emerald-600">
                  Use Cases
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><Link href="#">Codebase Onboarding</Link></li>
                  <li><Link href="#">Code Documentation</Link></li>
                  <li><Link href="#">Technical Debt Analysis</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <Link href="/pricing" className="text-gray-700 hover:text-gray-900 transition-all">
          Pricing
        </Link>
      </nav>

      {/* Login Button */}
      <div className="hidden md:block">
        <Link href="/sign-in">
          <Button variant="ghost" className="mr-3">Login</Button>
        </Link>
        <Link href="/sign-up">
          <Button className="bg-gradient-to-r from-emerald-500 to-teal-500">
            Get Started
          </Button>
        </Link>
      </div>

      {/* Mobile Menu Button */}
      <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
        {isOpen ? <X /> : <Menu />}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full w-full bg-white shadow-lg md:hidden">
          <nav className="flex flex-col space-y-4 p-6">
            <Link href="/">Home</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/sign-in">Login</Link>
            <Link href="/sign-up">Get Started</Link>
          </nav>
        </div>
      )}
    </header>
  )
}
```

**Time:** 1.5 hours
**Checkpoint:** Navbar looks professional with dropdowns

---

### **TASK 1.2: Enhance Dashboard (1 hour)**

**File:** `/src/app/(protected)/dashboard/page.tsx`

**What to add:**
1. Ask Question card (quick access)
2. Recent Activity section
3. Better empty states
4. Loading skeletons

**Code to add:**

```typescript
// Add Ask Question Card to dashboard
<GlassCard className="col-span-full">
  <h3 className="text-lg font-semibold mb-4">Quick Ask</h3>
  <form onSubmit={handleQuickQuestion} className="flex gap-2">
    <input
      type="text"
      placeholder="Ask anything about your code..."
      className="flex-1 px-4 py-2 border rounded-lg"
      value={quickQuestion}
      onChange={(e) => setQuickQuestion(e.target.value)}
    />
    <Button type="submit" disabled={!selectedProject}>
      <Sparkles className="h-4 w-4 mr-2" />
      Ask AI
    </Button>
  </form>
  {!selectedProject && (
    <p className="text-sm text-gray-500 mt-2">
      Select a project to ask questions
    </p>
  )}
</GlassCard>

// Add Recent Activity Section
<GlassCard>
  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
  <div className="space-y-3">
    {recentActivity.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
        <p className="text-sm">Start by creating a project!</p>
      </div>
    ) : (
      recentActivity.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
          <activity.icon className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-medium">{activity.title}</p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
      ))
    )}
  </div>
</GlassCard>
```

**Time:** 1 hour
**Checkpoint:** Dashboard looks complete and functional

---

### **TASK 1.3: Loading States (30 min)**

**Files:** Multiple components

**Add loading skeletons:**

```typescript
// /src/components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />
  )
}

// In dashboard page.tsx
{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <GlassCard key={i}>
        <Skeleton className="h-4 w-20 mb-4" />
        <Skeleton className="h-8 w-16" />
      </GlassCard>
    ))}
  </div>
) : (
  // Actual stats
)}
```

**Time:** 30 minutes
**Checkpoint:** Professional loading states everywhere

---

### **TASK 1.4: User Dropdown in Sidebar (1 hour)**

**File:** `/src/components/layout/Sidebar.tsx`

**Add at bottom of sidebar:**

```typescript
import { UserButton } from '@clerk/nextjs'
import { CreditCard } from 'lucide-react'

// At bottom of sidebar
<div className="border-t border-gray-200 p-4">
  <div className="flex items-center justify-between">
    {!isCollapsed && (
      <div className="flex-1">
        <p className="text-sm font-medium">Credits</p>
        <p className="text-xs text-gray-500">{userCredits} remaining</p>
      </div>
    )}
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-10 w-10"
        }
      }}
    />
  </div>

  {!isCollapsed && (
    <Button
      variant="outline"
      size="sm"
      className="w-full mt-3"
      onClick={() => router.push('/billing')}
    >
      <CreditCard className="h-4 w-4 mr-2" />
      Buy Credits
    </Button>
  )}
</div>
```

**Time:** 1 hour
**Checkpoint:** User can see credits and profile in sidebar

---

### **PHASE 1 COMPLETION: 32% (+4%)**

---

## 🚀 **PHASE 2: FULL VECTOR SEARCH (13-15 hours)**

### **Goal:** Complete GitHub integration with RAG system

---

## **PART A: SETUP & DEPENDENCIES (2-3 hours)**

### **TASK 2.1: Install Dependencies (30 min)**

```bash
npm install @langchain/community @langchain/core @ai-sdk/google ai octokit
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

**Verify installation:**
```bash
npm list @langchain/community
npm list ai
```

**Time:** 30 minutes

---

### **TASK 2.2: Enable pgvector Extension (1 hour)**

**Step 1: Update Prisma Schema**

**File:** `/prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

model SourceCodeEmbedding {
  id               String                 @id @default(cuid())
  summaryEmbedding Unsupported("vector")?
  sourceCode       String                 @db.Text
  fileName         String
  summary          String                 @db.Text
  projectId        String
  project          Project                @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Step 2: Create Migration**

```bash
# Stop any running dev server
# Create migration folder
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_enable_pgvector

# Create migration.sql
cat > prisma/migrations/$(date +%Y%m%d%H%M%S)_enable_pgvector/migration.sql << 'EOF'
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing table
DROP TABLE IF EXISTS "SourceCodeEmbedding";

-- Recreate with vector column
CREATE TABLE "SourceCodeEmbedding" (
    "id" TEXT NOT NULL,
    "summaryEmbedding" vector(768),
    "sourceCode" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "SourceCodeEmbedding_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "SourceCodeEmbedding" ADD CONSTRAINT "SourceCodeEmbedding_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS "SourceCodeEmbedding_summaryEmbedding_idx"
ON "SourceCodeEmbedding" USING ivfflat ("summaryEmbedding" vector_cosine_ops);
EOF
```

**Step 3: Apply Migration**

```bash
# Regenerate Prisma client
npx prisma generate

# Apply migration
npx prisma db push

# Verify
npx prisma studio
# Check if SourceCodeEmbedding table has summaryEmbedding column
```

**Time:** 1 hour
**Checkpoint:** pgvector working, table has vector column

---

### **TASK 2.3: Update Gemini Helper (30 min)**

**File:** `/src/lib/gemini.ts`

**Add missing function:**

```typescript
// Add to existing gemini.ts

export const generateEmbedding = async (text: string) => {
  try {
    const embeddingModel = genAI.getGenerativeModel({
      model: 'text-embedding-004'
    })
    const result = await embeddingModel.embedContent(text)
    return result.embedding.values  // Returns 768-dim array
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}
```

**Test it:**

```bash
# Create test-embedding.mjs
cat > test-embedding.mjs << 'EOF'
import { generateEmbedding } from './src/lib/gemini.ts'

const vector = await generateEmbedding("Hello world")
console.log("Dimensions:", vector.length)  // Should be 768
console.log("First 10 values:", vector.slice(0, 10))
EOF

node --loader ts-node/esm test-embedding.mjs
```

**Time:** 30 minutes
**Checkpoint:** Embedding generation working (768 dimensions)

---

## **PART B: GITHUB INTEGRATION (4-5 hours)**

### **TASK 2.4: GitHub Loader Implementation (2 hours)**

**File:** `/src/lib/github-loader.ts` (create new)

```typescript
import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github'
import { Document } from '@langchain/core/documents'
import { generateEmbedding, summarizeCode } from './gemini'
import { db } from '@/server/db'
import { Octokit } from 'octokit'

// Parse GitHub URL
export function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) throw new Error('Invalid GitHub URL')
  return {
    owner: match[1],
    repo: match[2].replace('.git', '')
  }
}

// Load repository files using LangChain
export async function loadGithubRepo(
  githubUrl: string,
  githubToken?: string
): Promise<Document[]> {
  console.log('Loading repo:', githubUrl)

  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || process.env.GITHUB_TOKEN || '',
    branch: 'main',
    ignoreFiles: [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'bun.lockb',
      '.next',
      'node_modules',
      '.git'
    ],
    recursive: true,
    unknown: 'warn',
    maxConcurrency: 5,
  })

  try {
    const docs = await loader.load()
    console.log(`Loaded ${docs.length} files`)
    return docs
  } catch (error) {
    console.error('Error loading repo:', error)
    throw new Error('Failed to load repository. Check URL and access.')
  }
}

// Check file count for credit calculation
export async function checkCredits(
  githubUrl: string,
  githubToken?: string
): Promise<number> {
  const { owner, repo } = parseGithubUrl(githubUrl)
  const octokit = new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN })

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    })

    if (Array.isArray(data)) {
      // Count files recursively
      const count = await countFilesRecursive(octokit, owner, repo, '')
      return count
    }

    return 0
  } catch (error) {
    console.error('Error checking credits:', error)
    return 0
  }
}

async function countFilesRecursive(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  acc: number = 0
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
    console.error(`Error counting files in ${path}:`, error)
    return acc
  }
}

// Generate embeddings for all documents
async function generateEmbeddings(docs: Document[]) {
  console.log(`Generating embeddings for ${docs.length} files...`)

  const embeddings = await Promise.all(
    docs.map(async (doc, index) => {
      try {
        console.log(`Processing ${index + 1}/${docs.length}: ${doc.metadata.source}`)

        // Summarize code (max 10k chars)
        const code = doc.pageContent.slice(0, 10000)
        const summary = await summarizeCode(code, doc.metadata.source)

        if (!summary) {
          console.warn(`No summary for ${doc.metadata.source}`)
          return null
        }

        // Generate embedding from summary
        const embedding = await generateEmbedding(summary)

        return {
          summary,
          embedding,
          sourceCode: doc.pageContent,
          fileName: doc.metadata.source,
        }
      } catch (error) {
        console.error(`Error processing ${doc.metadata.source}:`, error)
        return null
      }
    })
  )

  return embeddings.filter((e) => e !== null)
}

// Main indexing function
export async function indexGithubRepo(
  projectId: string,
  githubUrl: string,
  githubToken?: string
) {
  console.log('Starting indexing for project:', projectId)

  // Step 1: Load repository
  const docs = await loadGithubRepo(githubUrl, githubToken)

  if (docs.length === 0) {
    throw new Error('No files found in repository')
  }

  // Step 2: Generate embeddings
  const allEmbeddings = await generateEmbeddings(docs)

  console.log(`Generated ${allEmbeddings.length} embeddings`)

  // Step 3: Store in database
  const results = await Promise.allSettled(
    allEmbeddings.map(async (embedding) => {
      if (!embedding) return

      // Create record first
      const record = await db.sourceCodeEmbedding.create({
        data: {
          summary: embedding.summary,
          sourceCode: embedding.sourceCode,
          fileName: embedding.fileName,
          projectId,
        },
      })

      // Update with vector using raw SQL
      await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embedding}::vector
        WHERE "id" = ${record.id}
      `

      return record
    })
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  console.log(`Successfully indexed ${successful}/${allEmbeddings.length} files`)

  return {
    indexed: successful,
    total: docs.length,
  }
}
```

**Time:** 2 hours
**Checkpoint:** Can load repo and generate embeddings

---

### **TASK 2.5: Create Index API Route (1 hour)**

**File:** `/src/app/api/projects/[projectId]/index/route.ts` (create new)

```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { indexGithubRepo, checkCredits } from '@/lib/github-loader'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get project
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        userToProjects: {
          where: { userId },
        },
      },
    })

    if (!project || project.userToProjects.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if already indexed
    const existingEmbeddings = await db.sourceCodeEmbedding.findFirst({
      where: { projectId },
    })

    if (existingEmbeddings) {
      return NextResponse.json(
        { error: 'Project already indexed' },
        { status: 400 }
      )
    }

    // Check credits needed
    const fileCount = await checkCredits(project.githubUrl)
    const creditsNeeded = Math.ceil(fileCount / 10) // 1 credit per 10 files

    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}`,
          creditsNeeded,
          userCredits: user.credits,
        },
        { status: 403 }
      )
    }

    // Start indexing
    console.log(`Indexing ${fileCount} files (${creditsNeeded} credits)`)

    const result = await indexGithubRepo(projectId, project.githubUrl)

    // Deduct credits
    await db.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: creditsNeeded,
        },
      },
    })

    return NextResponse.json({
      success: true,
      ...result,
      creditsUsed: creditsNeeded,
      remainingCredits: user.credits - creditsNeeded,
    })
  } catch (error: any) {
    console.error('Error indexing project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to index project' },
      { status: 500 }
    )
  }
}
```

**Time:** 1 hour
**Checkpoint:** Can trigger indexing via API

---

### **TASK 2.6: Add Index Button to UI (1 hour)**

**File:** `/src/app/(protected)/projects/page.tsx`

**Add indexing functionality:**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Database, Loader2 } from 'lucide-react'

export default function ProjectsPage() {
  const [indexing, setIndexing] = useState<string | null>(null)

  const handleIndex = async (projectId: string) => {
    setIndexing(projectId)
    try {
      const response = await fetch(`/api/projects/${projectId}/index`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index')
      }

      alert(`Successfully indexed ${data.indexed} files!`)
      // Refresh page or update UI
      window.location.reload()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIndexing(null)
    }
  }

  return (
    // In project card
    <Button
      onClick={() => handleIndex(project.id)}
      disabled={indexing === project.id}
      size="sm"
    >
      {indexing === project.id ? (
        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Indexing...</>
      ) : (
        <><Database className="h-4 w-4 mr-2" /> Index Repository</>
      )}
    </Button>
  )
}
```

**Time:** 1 hour
**Checkpoint:** Can index repos from UI

---

## **PART C: RAG SYSTEM (4-5 hours)**

### **TASK 2.7: Implement Vector Search (2 hours)**

**File:** `/src/lib/rag.ts` (create new)

```typescript
import { db } from '@/server/db'
import { Prisma } from '@prisma/client'
import { generateEmbedding } from './gemini'

export async function searchSimilarCode(
  question: string,
  projectId: string,
  limit: number = 10
) {
  // Generate embedding for question
  const queryVector = await generateEmbedding(question)

  if (!queryVector || queryVector.length !== 768) {
    throw new Error('Invalid embedding vector')
  }

  // Perform similarity search
  const results = await db.$queryRaw<
    Array<{
      fileName: string
      sourceCode: string
      summary: string
      similarity: number
    }>
  >`
    SELECT
      "fileName",
      "sourceCode",
      "summary",
      1 - ("summaryEmbedding" <=> ${Prisma.raw(`ARRAY[${queryVector.join(',')}]::vector`)}) AS similarity
    FROM "SourceCodeEmbedding"
    WHERE 1 - ("summaryEmbedding" <=> ${Prisma.raw(`ARRAY[${queryVector.join(',')}]::vector`)}) > 0.5
      AND "projectId" = ${projectId}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `

  return results
}

export function buildContext(results: any[]): string {
  if (results.length === 0) {
    return 'No relevant code found in the repository.'
  }

  let context = ''
  for (const doc of results) {
    context += `
File: ${doc.fileName}
Summary: ${doc.summary}
Code:
\`\`\`
${doc.sourceCode.slice(0, 1000)}
\`\`\`

`
  }

  return context
}
```

**Time:** 2 hours
**Checkpoint:** Vector search working, returns similar code

---

### **TASK 2.8: Streaming AI Responses (2 hours)**

**File:** `/src/app/api/projects/[projectId]/query/route.ts`

**Update to use RAG:**

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { db } from '@/server/db'
import { searchSimilarCode, buildContext } from '@/lib/rag'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { userId } = await auth()

    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { question } = await req.json()

    if (!question) {
      return new Response('Question required', { status: 400 })
    }

    // Get user and check credits
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.credits < 1) {
      return new Response('Insufficient credits', { status: 403 })
    }

    // Search similar code using RAG
    const results = await searchSimilarCode(question, projectId, 10)

    if (results.length === 0) {
      return Response.json({
        answer: "I couldn't find relevant code in this repository to answer your question.",
        filesReferences: [],
      })
    }

    // Build context
    const context = buildContext(results)

    // Stream AI response
    const stream = await streamText({
      model: google('gemini-1.5-flash'),
      prompt: `
You are an AI code assistant helping developers understand their codebase.
Your audience is a technical developer who wants clear, accurate answers.

Context from the repository:
${context}

User Question: ${question}

Provide a detailed, accurate answer based ONLY on the provided context.
If the context doesn't contain enough information, say so.
Use code snippets from the context when relevant.
Format your response in markdown.
`,
    })

    // Deduct credit
    await db.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    })

    // Save question
    await db.question.create({
      data: {
        question,
        answer: '', // Will be filled later
        projectId,
        userId,
        filesReferences: results.map(r => ({
          fileName: r.fileName,
          summary: r.summary,
        })),
      },
    })

    return stream.toTextStreamResponse({
      headers: {
        'X-Files-Count': results.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(error.message, { status: 500 })
  }
}
```

**Time:** 2 hours
**Checkpoint:** Streaming answers with code context

---

### **TASK 2.9: Update Frontend for Streaming (1 hour)**

**File:** `/src/app/(protected)/project/[projectId]/page.tsx`

**Update to handle streaming:**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [filesReferences, setFilesReferences] = useState<any[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setAnswer('')

    try {
      const response = await fetch(`/api/projects/${params.projectId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        throw new Error('Failed to get answer')
      }

      const filesCount = response.headers.get('X-Files-Count')
      console.log(`Using ${filesCount} code files for context`)

      // Read streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        setAnswer((prev) => prev + chunk)
      }
    } catch (error: any) {
      console.error('Error:', error)
      setAnswer('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about this codebase..."
          className="w-full px-4 py-3 border rounded-lg"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !question.trim()}>
          {loading ? (
            <><Loader2 className="animate-spin mr-2" /> Thinking...</>
          ) : (
            'Ask AI'
          )}
        </Button>
      </form>

      {answer && (
        <div className="prose max-w-none">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
```

**Time:** 1 hour
**Checkpoint:** Streaming works in UI

---

### **TASK 2.10: Add Code References Tab (1 hour)**

**File:** `/src/app/(protected)/project/[projectId]/page.tsx`

**Add tabs for code references:**

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

// After answer
{filesReferences.length > 0 && (
  <Tabs defaultValue="answer">
    <TabsList>
      <TabsTrigger value="answer">Answer</TabsTrigger>
      <TabsTrigger value="references">
        Code References ({filesReferences.length})
      </TabsTrigger>
    </TabsList>

    <TabsContent value="answer">
      <ReactMarkdown>{answer}</ReactMarkdown>
    </TabsContent>

    <TabsContent value="references">
      <div className="space-y-4">
        {filesReferences.map((file, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h4 className="font-mono text-sm font-semibold mb-2">
              {file.fileName}
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              {file.summary}
            </p>
            <SyntaxHighlighter
              language="typescript"
              style={vscDarkPlus}
              className="rounded-lg"
            >
              {file.sourceCode.slice(0, 500)}
            </SyntaxHighlighter>
          </div>
        ))}
      </div>
    </TabsContent>
  </Tabs>
)}
```

**Time:** 1 hour
**Checkpoint:** Beautiful code references display

---

## **PHASE 2 COMPLETION: 42% (+10%)**

---

## ✅ **TESTING & VALIDATION (1-2 hours)**

### **Test Checklist:**

1. **Vector Extension**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
   # Should show vector extension
   ```

2. **Embedding Generation**
   ```bash
   node test-embedding.mjs
   # Should output 768 dimensions
   ```

3. **Repository Indexing**
   - Create small test project
   - Click "Index Repository"
   - Check console logs
   - Verify embeddings in Prisma Studio

4. **Vector Search**
   - Ask question
   - Check network tab for streaming
   - Verify answer uses code context
   - Check code references tab

5. **Full Flow**
   - Create project → Index → Ask question → Get answer
   - Check credits deduction
   - Verify answer quality

---

## 🎯 **FINAL RESULT**

### **You Will Have:**

✅ **Enhanced UI (32%)**
- Professional navbar with dropdowns
- Complete dashboard with all cards
- Loading states everywhere
- User dropdown with credits

✅ **Full Vector Search (42%)**
- pgvector extension working
- GitHub repository indexing
- 768-dimensional embeddings
- RAG system with similarity search
- Streaming AI responses
- Code references display
- Syntax highlighting

✅ **Production Ready**
- Error handling
- Credit system working
- Professional UX
- Performance optimized

---

## ⚠️ **CRITICAL NOTES**

### **If Running Out of Time:**

**Priority 1 (Must Have):**
- pgvector setup
- Basic indexing (even 5 files)
- Vector search working
- One test query working

**Priority 2 (Should Have):**
- Full repo indexing
- Streaming responses
- Code references

**Priority 3 (Nice to Have):**
- Enhanced navbar
- Dashboard improvements
- Syntax highlighting

### **Stopping Points:**

1. **After 10 hours:** If not at Task 2.7, stop and test what you have
2. **After 14 hours:** Finish current task, then test
3. **After 16 hours:** STOP, sleep, polish in morning

### **Emergency Fallback:**

If vector search fails:
- Keep text-based search
- Show "Vector search in development"
- Still hit 38-40% without vectors

---

## 📞 **NEED HELP?**

### **Common Issues:**

**pgvector won't install:**
```bash
# Use Docker with vector support
docker run -d \
  --name gitmind-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=gitmind \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

**LangChain errors:**
```bash
# Try alternative loader
npm install simple-git
# Use simple-git to clone and read files
```

**Streaming not working:**
```bash
# Use regular responses first
# Add streaming later
```

---

## 🎓 **SUCCESS CRITERIA**

### **You're Done When:**

1. ✅ Can index a small repo (10-20 files)
2. ✅ Can ask questions and get code-aware answers
3. ✅ Can see code references
4. ✅ Embeddings stored in database
5. ✅ Vector search returns results

### **Demo Flow:**

1. Show landing page (pretty design)
2. Sign in
3. Create project from GitHub
4. Click "Index Repository"
5. Wait for indexing (show logs)
6. Ask question about code
7. Show streaming answer
8. Show code references tab
9. Explain vector search
10. Show database (Prisma Studio)

---

## 🚀 **READY TO START?**

**Next Steps:**
1. Read this plan thoroughly (15 min)
2. Set up work environment
3. Start with Task 1.1
4. Follow the plan sequentially
5. Take breaks every 2 hours
6. Test after each major task

**Let's get to 42%!** 💪

---

**Created:** $(date)
**Target Completion:** Tomorrow 11 AM
**Expected Result:** 42% (Exceeds 40% target!)
