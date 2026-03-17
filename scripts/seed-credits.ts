/**
 * One-time script to set all existing users' credits to 10,000.
 *
 * Run with:
 *   npx tsx scripts/seed-credits.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Updating all existing users to 10,000 credits...')

  const result = await db.user.updateMany({
    data: { credits: 10000 },
  })

  console.log(`Done. Updated ${result.count} user(s).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
