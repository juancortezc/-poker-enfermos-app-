import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const players = await prisma.player.findMany({
    where: {
      firstName: { startsWith: 'Jose' },
      lastName: 'Moreno'
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      photoUrl: true
    }
  })

  console.log(players)
}

run().finally(() => prisma.$disconnect())
