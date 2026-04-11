import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { fetchOpenPRs, fetchPRDetail, fetchPRFiles, fetchFullDiff } from '@/lib/github-pr'
import { runAIReview } from '@/lib/ai-review'
import { triggerPREvent } from '@/lib/pusher'

export const reviewRouter = createTRPCRouter({
  // List open PRs from GitHub (not stored yet)
  fetchPRList: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { githubUrl: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })

      return fetchOpenPRs(project.githubUrl)
    }),

  // Import a PR from GitHub into GitMind
  importPullRequest: protectedProcedure
    .input(z.object({ projectId: z.string(), prNumber: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, githubUrl: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })

      // Check membership
      const membership = await ctx.db.userToProject.findUnique({
        where: { userId_projectId: { userId: ctx.userId, projectId: input.projectId } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a project member' })

      // Check if already imported
      const existing = await ctx.db.pullRequest.findUnique({
        where: { projectId_githubPrNumber: { projectId: input.projectId, githubPrNumber: input.prNumber } },
      })
      if (existing) return existing

      // Fetch PR detail and files from GitHub
      const [prDetail, prFiles] = await Promise.all([
        fetchPRDetail(project.githubUrl, input.prNumber),
        fetchPRFiles(project.githubUrl, input.prNumber),
      ])

      // Create PR record with files
      const pr = await ctx.db.pullRequest.create({
        data: {
          projectId: input.projectId,
          githubPrNumber: prDetail.number,
          title: prDetail.title,
          description: prDetail.body,
          authorGithubLogin: prDetail.authorLogin,
          authorAvatarUrl: prDetail.authorAvatarUrl,
          baseBranch: prDetail.baseBranch,
          headBranch: prDetail.headBranch,
          githubUrl: prDetail.htmlUrl,
          files: {
            create: prFiles.map((f) => ({
              fileName: f.filename,
              status: f.status,
              additions: f.additions,
              deletions: f.deletions,
              patch: f.patch,
            })),
          },
        },
        include: { files: true },
      })

      // Trigger AI review in background
      runAIReview(pr.id).then(() => {
        triggerPREvent(pr.id, 'ai-review-complete', { pullRequestId: pr.id })
      })

      // Deduct credits (1 per file)
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { credits: { decrement: Math.max(prFiles.length, 1) } },
      })

      return pr
    }),

  // Get all PRs for a project
  getPullRequests: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.pullRequest.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true, reviewers: true, files: true } },
          reviewers: { include: { user: true } },
        },
      })
    }),

  // Get single PR with all details
  getPullRequest: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pr = await ctx.db.pullRequest.findUnique({
        where: { id: input.pullRequestId },
        include: {
          files: {
            include: {
              _count: { select: { comments: true } },
            },
          },
          reviewers: { include: { user: true } },
          comments: {
            include: { user: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
      if (!pr) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pull request not found' })
      return pr
    }),

  // Get comments for a specific file or entire PR
  getComments: protectedProcedure
    .input(z.object({ pullRequestId: z.string(), prFileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.reviewComment.findMany({
        where: {
          pullRequestId: input.pullRequestId,
          ...(input.prFileId ? { prFileId: input.prFileId } : {}),
        },
        include: { user: true },
        orderBy: [{ lineNumber: 'asc' }, { createdAt: 'asc' }],
      })
    }),

  // Add a human comment
  addComment: protectedProcedure
    .input(
      z.object({
        pullRequestId: z.string(),
        prFileId: z.string().optional(),
        lineNumber: z.number().optional(),
        side: z.string().optional(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.reviewComment.create({
        data: {
          pullRequestId: input.pullRequestId,
          prFileId: input.prFileId || null,
          lineNumber: input.lineNumber || null,
          side: input.side || null,
          body: input.body,
          commentType: 'HUMAN',
          userId: ctx.userId,
        },
        include: { user: true },
      })

      await triggerPREvent(input.pullRequestId, 'new-comment', { comment })

      return comment
    }),

  // Toggle comment resolved status
  resolveComment: protectedProcedure
    .input(z.object({ commentId: z.string(), resolved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.reviewComment.update({
        where: { id: input.commentId },
        data: { resolved: input.resolved },
      })

      await triggerPREvent(comment.pullRequestId, 'comment-resolved', {
        commentId: comment.id,
        resolved: comment.resolved,
      })

      return comment
    }),

  // Assign a reviewer
  assignReviewer: protectedProcedure
    .input(z.object({ pullRequestId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the target user is a project member
      const pr = await ctx.db.pullRequest.findUnique({
        where: { id: input.pullRequestId },
        select: { projectId: true },
      })
      if (!pr) throw new TRPCError({ code: 'NOT_FOUND' })

      const membership = await ctx.db.userToProject.findUnique({
        where: { userId_projectId: { userId: input.userId, projectId: pr.projectId } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not a project member' })

      const reviewer = await ctx.db.reviewer.create({
        data: {
          pullRequestId: input.pullRequestId,
          userId: input.userId,
        },
        include: { user: true },
      })

      await triggerPREvent(input.pullRequestId, 'reviewer-assigned', { reviewer })

      return reviewer
    }),

  // Remove a reviewer
  removeReviewer: protectedProcedure
    .input(z.object({ pullRequestId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.reviewer.delete({
        where: { pullRequestId_userId: { pullRequestId: input.pullRequestId, userId: input.userId } },
      })
    }),

  // Submit review verdict (approve or request changes)
  submitReview: protectedProcedure
    .input(
      z.object({
        pullRequestId: z.string(),
        status: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a project member
      const pr = await ctx.db.pullRequest.findUnique({
        where: { id: input.pullRequestId },
        select: { projectId: true },
      })
      if (!pr) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pull request not found' })

      const membership = await ctx.db.userToProject.findUnique({
        where: { userId_projectId: { userId: ctx.userId, projectId: pr.projectId } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a project member' })

      // Auto-assign as reviewer if not already assigned
      const reviewer = await ctx.db.reviewer.upsert({
        where: { pullRequestId_userId: { pullRequestId: input.pullRequestId, userId: ctx.userId } },
        create: {
          pullRequestId: input.pullRequestId,
          userId: ctx.userId,
          status: input.status,
        },
        update: { status: input.status },
      })

      // Recalculate overall PR status
      const allReviewers = await ctx.db.reviewer.findMany({
        where: { pullRequestId: input.pullRequestId },
      })

      let prStatus: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' = 'PENDING'
      if (allReviewers.some((r) => r.status === 'CHANGES_REQUESTED')) {
        prStatus = 'CHANGES_REQUESTED'
      } else if (allReviewers.length > 0 && allReviewers.every((r) => r.status === 'APPROVED')) {
        prStatus = 'APPROVED'
      }

      await ctx.db.pullRequest.update({
        where: { id: input.pullRequestId },
        data: { status: prStatus },
      })

      await triggerPREvent(input.pullRequestId, 'review-submitted', {
        reviewerId: reviewer.id,
        userId: ctx.userId,
        status: input.status,
        prStatus,
      })

      return { reviewerStatus: input.status, prStatus }
    }),

  // Re-run AI review
  triggerAIReview: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete existing AI comments
      await ctx.db.reviewComment.deleteMany({
        where: { pullRequestId: input.pullRequestId, commentType: 'AI' },
      })

      // Clear old summary
      await ctx.db.pullRequest.update({
        where: { id: input.pullRequestId },
        data: { aiSummary: null },
      })

      const pr = await ctx.db.pullRequest.findUnique({
        where: { id: input.pullRequestId },
        include: { files: true },
      })
      if (!pr) throw new TRPCError({ code: 'NOT_FOUND' })

      // Deduct credits
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { credits: { decrement: Math.max(pr.files.length, 1) } },
      })

      // Run AI review in background
      runAIReview(input.pullRequestId).then(() => {
        triggerPREvent(input.pullRequestId, 'ai-review-complete', { pullRequestId: input.pullRequestId })
      })

      return { success: true }
    }),
})
