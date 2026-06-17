/**
 * Update blind levels for the active tournament (T30) to the new structure.
 * Run with: npx tsx scripts/update-t30-blinds.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const NEW_BLIND_LEVELS = [
  { level: 1,  smallBlind: 50,    bigBlind: 100,   duration: 12 },
  { level: 2,  smallBlind: 100,   bigBlind: 200,   duration: 12 },
  { level: 3,  smallBlind: 150,   bigBlind: 300,   duration: 12 },
  { level: 4,  smallBlind: 200,   bigBlind: 400,   duration: 12 },
  { level: 5,  smallBlind: 300,   bigBlind: 600,   duration: 12 },
  { level: 6,  smallBlind: 400,   bigBlind: 800,   duration: 12 },
  { level: 7,  smallBlind: 0,     bigBlind: 0,     duration: 20 }, // DESCANSO
  { level: 8,  smallBlind: 500,   bigBlind: 1000,  duration: 16 },
  { level: 9,  smallBlind: 600,   bigBlind: 1200,  duration: 16 },
  { level: 10, smallBlind: 800,   bigBlind: 1600,  duration: 16 },
  { level: 11, smallBlind: 1000,  bigBlind: 2000,  duration: 16 },
  { level: 12, smallBlind: 1500,  bigBlind: 3000,  duration: 16 },
  { level: 13, smallBlind: 2000,  bigBlind: 4000,  duration: 16 },
  { level: 14, smallBlind: 3000,  bigBlind: 6000,  duration: 16 },
  { level: 15, smallBlind: 4000,  bigBlind: 8000,  duration: 16 },
  { level: 16, smallBlind: 5000,  bigBlind: 10000, duration: 10 },
  { level: 17, smallBlind: 6000,  bigBlind: 12000, duration: 10 },
  { level: 18, smallBlind: 8000,  bigBlind: 16000, duration: 10 },
  { level: 19, smallBlind: 10000, bigBlind: 20000, duration: 0  },
]

async function main() {
  const activeTournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    include: { blindLevels: { orderBy: { level: 'asc' } } }
  })

  if (!activeTournament) {
    console.error('No hay torneo activo')
    process.exit(1)
  }

  console.log(`Torneo activo: T${activeTournament.number} (ID: ${activeTournament.id})`)
  console.log(`Niveles actuales: ${activeTournament.blindLevels.length}`)

  await prisma.$transaction(async (tx) => {
    // Delete existing blind levels
    await tx.blindLevel.deleteMany({ where: { tournamentId: activeTournament.id } })

    // Insert new blind levels
    await tx.blindLevel.createMany({
      data: NEW_BLIND_LEVELS.map(bl => ({
        tournamentId: activeTournament.id,
        level: bl.level,
        smallBlind: bl.smallBlind,
        bigBlind: bl.bigBlind,
        duration: bl.duration,
      }))
    })
  })

  console.log(`✅ Blinds actualizados: ${NEW_BLIND_LEVELS.length} niveles`)
  console.log('   Nivel 7 = DESCANSO automático (20 min, 0/0)')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
