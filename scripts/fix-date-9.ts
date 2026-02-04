import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDate9() {
  console.log('🔍 Buscando fechas stuck en in_progress...\n')

  // Find all in_progress game dates
  const inProgressDates = await prisma.gameDate.findMany({
    where: { status: 'in_progress' },
    include: {
      tournament: {
        select: { id: true, name: true, number: true }
      },
      eliminations: {
        orderBy: { position: 'asc' },
        include: {
          eliminatedPlayer: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      },
      timerStates: true
    }
  })

  if (inProgressDates.length === 0) {
    console.log('✅ No hay fechas stuck en in_progress')
    return
  }

  for (const gd of inProgressDates) {
    const totalPlayers = gd.playerIds.length
    const totalEliminations = gd.eliminations.length
    const hasWinner = gd.eliminations.some(e => e.position === 1)
    const winner = gd.eliminations.find(e => e.position === 1)

    console.log(`📅 Fecha ${gd.dateNumber} (ID: ${gd.id})`)
    console.log(`   Torneo: ${gd.tournament.name}`)
    console.log(`   Status: ${gd.status}`)
    console.log(`   Jugadores: ${totalPlayers}`)
    console.log(`   Eliminaciones: ${totalEliminations}`)
    console.log(`   Tiene ganador: ${hasWinner ? 'Sí' : 'No'}`)

    if (winner) {
      console.log(`   Ganador: ${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`)
    }

    // Check if ready to complete
    if (hasWinner && totalEliminations === totalPlayers) {
      console.log('\n   🔧 Arreglando fecha...')

      // Update game date status
      await prisma.gameDate.update({
        where: { id: gd.id },
        data: {
          status: 'completed'
        }
      })

      // Stop timer if exists
      if (gd.timerStates) {
        await prisma.timerState.update({
          where: { id: gd.timerStates.id },
          data: { status: 'inactive' }
        })
      }

      // Update winner's lastVictoryDate
      if (winner) {
        const scheduledDateStr = gd.scheduledDate.toLocaleDateString('es-EC')
        await prisma.player.update({
          where: { id: winner.eliminatedPlayerId },
          data: { lastVictoryDate: scheduledDateStr }
        })
        console.log(`   ✅ Actualizado lastVictoryDate del ganador a: ${scheduledDateStr}`)
      }

      console.log(`   ✅ Fecha ${gd.dateNumber} marcada como COMPLETED\n`)
    } else {
      console.log(`   ⚠️ No se puede completar automáticamente`)

      if (!hasWinner) {
        const eliminatedPlayerIds = gd.eliminations.map(e => e.eliminatedPlayerId)
        const remainingPlayerIds = gd.playerIds.filter(id => !eliminatedPlayerIds.includes(id))

        const remainingPlayers = await prisma.player.findMany({
          where: { id: { in: remainingPlayerIds } },
          select: { id: true, firstName: true, lastName: true }
        })

        console.log(`   Jugadores restantes: ${remainingPlayers.map(p => `${p.firstName} ${p.lastName}`).join(', ')}\n`)
      }
    }
  }
}

fixDate9()
  .then(() => {
    console.log('🏁 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
