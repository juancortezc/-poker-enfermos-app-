import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const player = await prisma.player.findFirst({
    where: {
      firstName: 'Jose Patricio',
      lastName: 'Moreno'
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      aliases: true
    }
  })

  console.log(player)

  const tournament = await prisma.tournamentWinners.findUnique({
    where: { tournamentNumber: 23 },
    include: {
      champion: true
    }
  })

  console.log(tournament?.champion)
}

run().finally(() => prisma.$disconnect())
