import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { indexGithubRepo, checkCredits, smartReIndexGithubRepo } from '@/lib/github-loader'
import { TRPCError } from '@trpc/server'
import { analyzeFile, computeCleanlinessScore, computeOrganizationScore } from '@/lib/code-analyzer'
import { analyzeCodeQuality, analyzeSecurityFindings } from '@/lib/ai'
import { analyzeFileSecurity, computeSecuritySummary } from '@/lib/security-analyzer'

export const projectRouter = createTRPCRouter({
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        githubUrl: z.string().url(),
        githubToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const githubUrl = input.githubUrl.replace(/\.git$/, '')
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
      })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })

      const fileCount = await checkCredits(githubUrl, input.githubToken)
      if (user.credits < fileCount) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Not enough credits. This repo needs ${fileCount} credits but you only have ${user.credits}.`,
        })
      }

      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          githubUrl: githubUrl,
          userToProjects: {
            create: { userId: ctx.userId },
          },
        },
      })

      try {
        await indexGithubRepo(project.id, githubUrl, input.githubToken)
      } catch (err: unknown) {
        // Clean up the project record so the user can try again
        await ctx.db.project.delete({ where: { id: project.id } })
        const message = err instanceof Error ? err.message : 'Failed to index repository'
        throw new TRPCError({ code: 'BAD_REQUEST', message })
      }

      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { credits: { decrement: fileCount } },
      })

      return project
    }),

  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: {
        userToProjects: { some: { userId: ctx.userId } },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  getCommits: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.commit.findMany({
        where: { projectId: input.projectId },
        orderBy: { commitDate: 'desc' },
        take: 10,
      })
    }),

  saveAnswer: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string(),
        answer: z.string(),
        filesReferences: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.question.create({
        data: {
          question: input.question,
          answer: input.answer,
          filesReferences: input.filesReferences ?? [],
          projectId: input.projectId,
          userId: ctx.userId,
        },
      })
    }),

  getAnswers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.question.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      })
    }),

  getAllAnswers: protectedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.db.project.findMany({
      where: {
        userToProjects: { some: { userId: ctx.userId } },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        questions: {
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        },
      },
    })
    return projects.filter((p) => p.questions.length > 0)
  }),

  archiveProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.projectId },
        data: { deletedAt: new Date() },
      })
    }),

  getTeamMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userToProject.findMany({
        where: { projectId: input.projectId },
        include: { user: true },
      })
    }),

  uploadMeeting: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        meetingUrl: z.string().url(),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.create({
        data: {
          meetingUrl: input.meetingUrl,
          projectId: input.projectId,
          name: input.name,
          status: 'PROCESSING',
        },
      })
      return meeting
    }),

  getMeetings: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.meeting.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        include: { issues: true },
      })
    }),

  getAllMeetings: protectedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.db.project.findMany({
      where: {
        userToProjects: { some: { userId: ctx.userId } },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        meetings: {
          orderBy: { createdAt: 'desc' },
          include: { issues: true },
        },
      },
    })
    return projects.filter((p) => p.meetings.length > 0)
  }),

  deleteMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.meeting.delete({
        where: { id: input.meetingId },
      })
    }),

  checkCredits: protectedProcedure
    .input(
      z.object({
        githubUrl: z.string().url(),
        githubToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const githubUrl = input.githubUrl.replace(/\.git$/, '')
      const fileCount = await checkCredits(githubUrl, input.githubToken)
      const user = await ctx.db.user.findUnique({ where: { id: ctx.userId } })
      return { fileCount, userCredits: user?.credits ?? 0 }
    }),

  getMyCredits: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: { credits: true },
    })
    return user?.credits ?? 0
  }),

  getMyTransactions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.stripeTransaction.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
    })
  }),

  verifyPayment: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if this session was already processed
      const existing = await ctx.db.stripeTransaction.findUnique({
        where: { stripeSessionId: input.sessionId },
      })
      if (existing) {
        return { status: 'already_processed' as const, credits: existing.credits }
      }

      // Verify the session with Stripe
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe not configured' })
      }

      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-01-28.clover',
      })

      const session = await stripe.checkout.sessions.retrieve(input.sessionId)

      if (session.payment_status !== 'paid') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment not completed' })
      }

      const sessionUserId = session.metadata?.userId
      if (sessionUserId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Session does not belong to this user' })
      }

      const credits = parseInt(session.metadata?.credits ?? '0')
      if (credits <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid credits amount' })
      }

      // Apply credits and record transaction
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { credits: { increment: credits } },
      })

      await ctx.db.stripeTransaction.create({
        data: {
          userId: ctx.userId,
          credits,
          stripeSessionId: input.sessionId,
        },
      })

      return { status: 'success' as const, credits }
    }),

  getProjectById: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId, deletedAt: null },
        select: {
          id: true,
          name: true,
          githubUrl: true,
          _count: { select: { userToProjects: true } },
        },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      return project
    }),

  reIndexProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userToProjects: { some: { userId: ctx.userId } },
          deletedAt: null,
        },
        select: { id: true, githubUrl: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })

      return smartReIndexGithubRepo(project.id, project.githubUrl)
    }),

  joinProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId, deletedAt: null },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })

      const existing = await ctx.db.userToProject.findUnique({
        where: { userId_projectId: { userId: ctx.userId, projectId: input.projectId } },
      })
      if (existing) return { alreadyMember: true }

      await ctx.db.userToProject.create({
        data: { userId: ctx.userId, projectId: input.projectId },
      })
      return { alreadyMember: false }
    }),

  getHealthReport: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.codeHealthReport.findUnique({
        where: { projectId: input.projectId },
      })
    }),

  runHealthAnalysis: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to this project
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userToProjects: { some: { userId: ctx.userId } },
          deletedAt: null,
        },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })

      // Fetch all indexed source code
      const embeddings = await ctx.db.sourceCodeEmbedding.findMany({
        where: { projectId: input.projectId },
      })

      if (embeddings.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No indexed files found. Please index the repository first.',
        })
      }

      // Create/reset the report to PROCESSING
      await ctx.db.codeHealthReport.upsert({
        where: { projectId: input.projectId },
        create: {
          projectId: input.projectId,
          overallScore: 0,
          cleanlinessScore: 0,
          organizationScore: 0,
          errorHandlingScore: 0,
          duplicationScore: 0,
          documentationScore: 0,
          todoCount: 0,
          fixmeCount: 0,
          consoleLogs: 0,
          largeFileCount: 0,
          totalFilesAnalyzed: embeddings.length,
          fileDetails: [],
          aiInsights: '',
          status: 'PROCESSING',
        },
        update: { status: 'PROCESSING' },
      })

      try {
        // --- Static analysis (instant, no AI needed) ---
        const analyses = embeddings.map((e) => analyzeFile(e.fileName, e.sourceCode))

        const cleanlinessScore = computeCleanlinessScore(analyses)
        const organizationScore = computeOrganizationScore(analyses)
        const todoCount = analyses.reduce((s, a) => s + a.todoCount, 0)
        const fixmeCount = analyses.reduce((s, a) => s + a.fixmeCount, 0)
        const consoleLogs = analyses.reduce((s, a) => s + a.consoleLogCount, 0)
        const largeFileCount = analyses.filter((a) => a.isLargeFile).length

        // --- AI analysis (error handling, duplication, documentation) ---
        const summaries = embeddings.map((e) => `${e.fileName}: ${e.summary}`)
        const sampleCode = embeddings
          .filter((e) => e.sourceCode.length > 100)
          .slice(0, 5)
          .map((e) => `// ${e.fileName}\n${e.sourceCode.slice(0, 1500)}`)

        const aiResult = await analyzeCodeQuality(summaries, sampleCode)

        // --- Weighted overall score ---
        // Cleanliness 25% | Organization 15% | Error Handling 30% | Duplication 20% | Documentation 10%
        const overallScore = Math.round(
          cleanlinessScore * 0.25 +
          organizationScore * 0.15 +
          aiResult.errorHandlingScore * 0.30 +
          aiResult.duplicationScore * 0.20 +
          aiResult.documentationScore * 0.10,
        )

        // Build file details sorted worst-first
        const fileDetails = analyses
          .sort((a, b) => a.score - b.score)
          .map((a) => ({
            fileName: a.fileName,
            score: a.score,
            lines: a.lines,
            issues: a.issues,
            todoCount: a.todoCount,
            fixmeCount: a.fixmeCount,
            consoleLogCount: a.consoleLogCount,
            isLargeFile: a.isLargeFile,
            hasErrorHandling: a.hasErrorHandling,
          }))

        return ctx.db.codeHealthReport.update({
          where: { projectId: input.projectId },
          data: {
            overallScore,
            cleanlinessScore,
            organizationScore,
            errorHandlingScore: aiResult.errorHandlingScore,
            duplicationScore: aiResult.duplicationScore,
            documentationScore: aiResult.documentationScore,
            todoCount,
            fixmeCount,
            consoleLogs,
            largeFileCount,
            totalFilesAnalyzed: analyses.length,
            fileDetails,
            aiInsights: aiResult.insights,
            status: 'COMPLETED',
          },
        })
      } catch (error) {
        await ctx.db.codeHealthReport.update({
          where: { projectId: input.projectId },
          data: { status: 'FAILED' },
        })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Analysis failed. Please try again.',
        })
      }
    }),

  getSecurityReport: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.securityScanReport.findUnique({
        where: { projectId: input.projectId },
      })
    }),

  runSecurityScan: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userToProjects: { some: { userId: ctx.userId } },
          deletedAt: null,
        },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })

      const embeddings = await ctx.db.sourceCodeEmbedding.findMany({
        where: { projectId: input.projectId },
      })

      if (embeddings.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No indexed files found. Please index the repository first.',
        })
      }

      await ctx.db.securityScanReport.upsert({
        where: { projectId: input.projectId },
        create: {
          projectId: input.projectId,
          overallScore: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          totalIssues: 0,
          totalFilesScanned: embeddings.length,
          topFindings: [],
          aiInsights: '',
          status: 'PROCESSING',
        },
        update: { status: 'PROCESSING' },
      })

      try {
        const fileResults = embeddings.map((e) =>
          analyzeFileSecurity(e.fileName, e.sourceCode)
        )

        const summary = computeSecuritySummary(fileResults)

        const findingsSummary = summary.topFindings.map(
          (f) => `[${f.severity.toUpperCase()}] ${f.category} in ${f.fileName}: ${f.description}`
        )
        const sampleSnippets = summary.topFindings
          .filter((f) => f.severity === 'critical' || f.severity === 'high')
          .slice(0, 10)
          .map((f) => `// ${f.fileName}\n${f.snippet}`)

        const aiResult =
          summary.totalIssues > 0
            ? await analyzeSecurityFindings(findingsSummary, sampleSnippets)
            : { insights: 'No security issues detected. The codebase looks clean based on static analysis.' }

        return ctx.db.securityScanReport.update({
          where: { projectId: input.projectId },
          data: {
            overallScore: summary.overallScore,
            criticalCount: summary.criticalCount,
            highCount: summary.highCount,
            mediumCount: summary.mediumCount,
            totalIssues: summary.totalIssues,
            totalFilesScanned: fileResults.length,
            topFindings: summary.topFindings as unknown as import('@prisma/client').Prisma.InputJsonValue,
            aiInsights: aiResult.insights,
            status: 'COMPLETED',
          },
        })
      } catch (error) {
        await ctx.db.securityScanReport.update({
          where: { projectId: input.projectId },
          data: { status: 'FAILED' },
        })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Security scan failed. Please try again.',
        })
      }
    }),
})
