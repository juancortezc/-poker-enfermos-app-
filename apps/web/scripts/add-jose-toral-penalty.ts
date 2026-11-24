import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addJoseToralPenalty() {
  console.log('🔍 Buscando torneo activo y a Jose Toral...\n')

  const tournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    orderBy: { number: 'desc' },
  })

  if (!tournament) {
    throw new Error('No se encontró un torneo activo')
  }

  const player = await prisma.player.findFirst({
    where: {
      firstName: { contains: 'Jose', mode: 'insensitive' },
      lastName: { equals: 'Toral', mode: 'insensitive' },
    },
  })

  if (!player) {
    throw new Error('No se encontró al jugador Jose Toral')
  }

  console.log(`✅ Torneo: ${tournament.name} (#${tournament.number})`)
  console.log(`✅ Jugador: ${player.firstName} ${player.lastName} (${player.id})\n`)

  const existing = await prisma.playerAdjustment.findFirst({
    where: {
      tournamentId: tournament.id,
      playerId: player.id,
      reason: 'No cumplió penitencia',
    },
  })

  if (existing) {
    console.log('⚠️ Ya existe una multa con esta razón para este jugador/torneo. No se crea duplicado.')
    return
  }

  const adjustment = await prisma.playerAdjustment.create({
    data: {
      tournamentId: tournament.id,
      playerId: player.id,
      reason: 'No cumplió penitencia',
      pointsPenalty: 5,
    },
  })

  console.log(`🏁 Multa creada (ID ${adjustment.id}): -5 puntos a ${player.firstName} ${player.lastName} en ${tournament.name}`)
}

addJoseToralPenalty()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
