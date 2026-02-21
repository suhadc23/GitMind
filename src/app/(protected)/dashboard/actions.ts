'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/server/db'

export async function getFileReferences(question: string, projectId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sourceCodeEmbeddings = await db.sourceCodeEmbedding.findMany({
    where: {
      projectId,
      OR: [
        {
          summary: {
            contains: question.split(' ').slice(0, 5).join(' '),
            mode: 'insensitive',
          },
        },
        {
          fileName: {
            contains: question.split(' ')[0] ?? '',
            mode: 'insensitive',
          },
        },
      ],
    },
    take: 10,
  })

  const embeddings =
    sourceCodeEmbeddings.length > 0
      ? sourceCodeEmbeddings
      : await db.sourceCodeEmbedding.findMany({
          where: { projectId },
          take: 5,
        })

  return embeddings
}
