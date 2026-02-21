import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { indexGithubRepo } from '@/lib/github-loader'
import { checkCredits } from '@/lib/github-loader'
import { TRPCError } from '@trpc/server'

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

      await indexGithubRepo(project.id, githubUrl, input.githubToken)

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
})
