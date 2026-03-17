# GitMind — Project Overview for Claude

## What This Project Does
GitMind is an AI-powered repository intelligence tool. Users connect a GitHub repository and get:
- AI-generated summaries of every file in the repo
- A Q&A interface to ask questions about the codebase (answers cite specific files)
- Commit log summaries powered by AI
- Meeting audio processing (AssemblyAI) that extracts key issues/decisions
- A billing system where users purchase credits to index more repos

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Prisma ORM |
| Auth | Clerk |
| AI (primary) | Groq (`@ai-sdk/groq`) |
| AI (fallback) | Google Gemini |
| AI streaming | Vercel AI SDK v6 (`streamText` + `toTextStreamResponse`) |
| API layer | tRPC v11 rc.446 |
| Payments | Stripe |
| File uploads | Firebase Storage |
| Meeting transcription | AssemblyAI |

---

## Repository Structure

```
src/
├── app/
│   ├── (protected)/          # All authenticated pages (sidebar layout)
│   │   ├── billing/          # Credits purchase + transaction history
│   │   ├── create/           # Create new project (link GitHub repo)
│   │   ├── dashboard/        # Main dashboard (Q&A, commits, meetings)
│   │   ├── meetings/         # Meeting upload + issue viewer
│   │   ├── project/[id]/     # Project-specific Q&A page
│   │   ├── projects/         # Projects list
│   │   ├── qa/               # Saved Q&A history
│   │   ├── aimodels/         # AI model info page
│   │   ├── docsummarizer/    # Document summarizer
│   │   ├── settings/         # User settings
│   │   ├── app-sidebar.tsx   # Sidebar (uses useProject hook + tRPC)
│   │   └── layout.tsx        # Protected layout (SidebarProvider)
│   ├── api/
│   │   ├── ask-question/     # Streaming Q&A route (POST)
│   │   ├── process-meeting/  # Meeting processing route (POST)
│   │   └── webhook/
│   │       ├── clerk/        # Clerk user lifecycle webhooks
│   │       └── stripe/       # Stripe payment webhooks
│   └── page.tsx              # Public landing page
├── components/ui/            # shadcn/ui components
├── hooks/
│   └── use-project.ts        # Active project selection (localStorage)
├── lib/
│   ├── ai.ts                 # Groq + Gemini AI helper functions
│   ├── assembly.ts           # AssemblyAI meeting transcription
│   ├── firebase.ts           # Firebase file upload
│   ├── github-loader.ts      # GitHub repo loading + indexing + credit check
│   └── stripe.ts             # Stripe checkout session server action
├── server/
│   ├── api/
│   │   ├── root.ts           # tRPC root router
│   │   └── routers/
│   │       └── project.ts    # All project-related tRPC procedures
│   ├── db.ts                 # Prisma client singleton
│   └── trpc.ts               # tRPC context + middleware
└── trpc/
    ├── react.tsx             # TRPCReactProvider (client)
    └── server.ts             # tRPC server caller (for RSC)
prisma/
└── schema.prisma             # Database schema
scripts/
└── seed-credits.ts           # One-time: set all users to 10,000 credits
```

---

## Database Schema (Key Models)

### User
- `id` — Clerk user ID (string, primary key)
- `emailAddress` — unique
- `credits` — integer, **default 10,000**
- Relations: `questions`, `stripeTransactions`, `userToProjects`

### Project
- `id` — cuid
- `githubUrl`, `name`
- `deletedAt` — soft delete (set when archived)
- Relations: `commits`, `meetings`, `questions`, `sourceCodeEmbeddings`, `userToProjects`

### SourceCodeEmbedding
- Stores per-file `summary`, `sourceCode` (max 20KB), `fileName` for each indexed project
- **No `createdAt` field** — do not orderBy it
- Text search via `contains` with `mode: 'insensitive'`

### StripeTransaction
- Audit trail of every credit purchase: `userId`, `credits`

### Meeting / Issue
- `Meeting` has a `status` enum: `PROCESSING | COMPLETED`
- `Issue` stores extracted discussion points: `start`, `end`, `gist`, `headline`, `summary`

---

## Credit System

| Event | Effect |
|---|---|
| New user signs up (Clerk webhook) | Created with **10,000 credits** |
| Project created | Costs **1 credit per file** in the repo |
| Credits purchased via Stripe | Credits incremented (Stripe webhook) |
| DB-level default | `credits Int @default(10000)` |

**Credit check flow** (`createProject` tRPC mutation):
1. Call `checkCredits(githubUrl)` → counts files via Octokit API recursively
2. Compare against `user.credits`
3. If insufficient → throw `FORBIDDEN` TRPCError
4. If sufficient → create project, run `indexGithubRepo`, then `decrement` credits

---

## AI / Streaming Pattern

- **No `ai/rsc`** — ai@6 doesn't export it
- Use `streamText(...)` → `result.toTextStreamResponse()` in route handlers
- Client reads chunks via `response.body?.getReader()`
- File references sent back via custom response header `X-Files-References` (base64 JSON)
- Streaming Q&A: `src/app/api/ask-question/route.ts`

---

## Webhooks

### Clerk (`/api/webhook/clerk`)
- `user.created` → `db.user.create` with `credits: 10000`
- `user.updated` → sync profile fields
- `user.deleted` → `db.user.delete`
- Verified via Svix signatures (`CLERK_WEBHOOK_SECRET`)

### Stripe (`/api/webhook/stripe`)
- `checkout.session.completed` → increment user credits + create `StripeTransaction`
- Verified via HMAC (`STRIPE_WEBHOOK_SECRET`)

---

## tRPC Procedures (`project.ts`)

| Procedure | Type | Purpose |
|---|---|---|
| `createProject` | mutation | Create project, index repo, deduct credits |
| `getProjects` | query | List user's non-deleted projects |
| `getCommits` | query | Last 10 commits for a project |
| `saveAnswer` | mutation | Save a Q&A pair |
| `getAnswers` | query | Get saved Q&A for a project |
| `archiveProject` | mutation | Soft-delete a project |
| `getTeamMembers` | query | List users linked to a project |
| `uploadMeeting` | mutation | Create a meeting record (PROCESSING) |
| `getMeetings` | query | List meetings with issues |
| `deleteMeeting` | mutation | Delete a meeting |
| `checkCredits` | mutation | Preview credit cost for a repo URL |
| `getMyCredits` | query | Current user credit balance |
| `getMyTransactions` | query | All Stripe transactions for user |

---

## Stripe Integration

- **Pricing**: $2 per 100 credits
- Lazy import required: `const Stripe = (await import('stripe')).default`
  (module-level init breaks build — no API key at build time)
- Stripe API version: `'2026-01-28.clover'`
- Located at: `src/lib/stripe.ts`

---

## GitHub Indexing Flow (`github-loader.ts`)

1. `parseGithubUrl` — extract owner + repo from URL
2. `detectDefaultBranch` — use Octokit, fallback to `main/master/develop/dev`
3. `loadGithubRepo` — LangChain `GithubRepoLoader`, recursive, ignores lock files/node_modules
4. `generateSummaries` — batches of 5 files, calls `summarizeCode` (Groq/Gemini), skips files >50KB
5. `db.sourceCodeEmbedding.create` — stores summary + sourceCode (max 20KB) + fileName

**Note**: Indexing is limited to first 10 files currently (demo mode).

---

## Adding a New Feature — Checklist

1. **DB change?** Edit `prisma/schema.prisma`, then run `npx prisma db push` (or create migration)
2. **New API endpoint?** Add a tRPC procedure in `src/server/api/routers/project.ts`
3. **New page?** Create under `src/app/(protected)/[page-name]/page.tsx`
4. **New AI feature?** Add helper in `src/lib/ai.ts` using `createGroq()`, with Gemini fallback
5. **Streaming response?** Use `streamText` + `toTextStreamResponse()` in a route handler
6. **Webhook?** Add handler in `src/app/api/webhook/[provider]/route.ts`

---

## Environment Variables Required

```
DATABASE_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
GITHUB_TOKEN
GROQ_API_KEY
GEMINI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
FIREBASE_API_KEY (and other Firebase config)
ASSEMBLYAI_API_KEY
```
