import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const primary = await prisma.player.findUnique({
    where: { id: 'cmfbl1aoz000zp8db4thegvmo' },
    select: { photoUrl: true }
  })

  if (!primary?.photoUrl) {
    console.log('Primary player missing photo; aborting')
    return
  }

  await prisma.player.update({
    where: { id: 'cmfvjlxva0000p8fm86fs09ml' },
    data: {
      photoUrl: primary.photoUrl,
      isTemporary: false,
      role: 'Enfermo'
    }
  })

  console.log('Updated duplicate player to share photo and role')
}

run().finally(() => prisma.$disconnect())
