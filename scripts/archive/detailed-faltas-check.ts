import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function detailedFaltasCheck() {
  console.log('🔍 VERIFICACIÓN DETALLADA DE FALTAS\n')

  const tournamentId = 1

  // Get registered players
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: {
        include: {
          player: true
        }
      }
    }
  })

  const registeredPlayers = tournament?.tournamentParticipants.map(tp => tp.player) || []
  const registeredIds = new Set(registeredPlayers.map(p => p.id))

  // Get all dates
  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId },
    select: {
      id: true,
      dateNumber: true,
      playerIds: true
    },
    orderBy: { dateNumber: 'asc' }
  })

  // Get all eliminations
  const allEliminations = await prisma.elimination.findMany({
    where: {
      gameDate: {
        tournamentId
      }
    },
    select: {
      gameDateId: true,
      eliminatedPlayerId: true,
      points: true
    }
  })

  console.log('═══════════════════════════════════════════════════════')
  console.log('ANÁLISIS COMPLETO - JUGADORES REGISTRADOS')
  console.log('═══════════════════════════════════════════════════════\n')

  const faltasByPlayer = new Map<string, number[]>()

  for (const player of registeredPlayers) {
    const faltas: number[] = []

    for (const gd of gameDates) {
      // ¿Está en playerIds?
      const expectedToPlay = gd.playerIds.includes(player.id)

      // ¿Tiene eliminación?
      const elimination = allEliminations.find(
        e => e.gameDateId === gd.id && e.eliminatedPlayerId === player.id
      )

      if (expectedToPlay && !elimination) {
        // Falta: estaba registrado para jugar pero no tiene eliminación
        faltas.push(gd.dateNumber)
      } else if (elimination && elimination.points === 0) {
        // Falta: tiene eliminación con 0 puntos
        faltas.push(gd.dateNumber)
      }
    }

    if (faltas.length > 0) {
      faltasByPlayer.set(player.id, faltas)
      console.log(`${player.firstName} ${player.lastName}:`)
      console.log(`  Faltas (${faltas.length}): Fechas ${faltas.join(', ')}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('RESUMEN')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log(`Jugadores registrados: ${registeredPlayers.length}`)
  console.log(`Jugadores con faltas: ${faltasByPlayer.size}`)
  console.log(`Total de faltas: ${Array.from(faltasByPlayer.values()).reduce((sum, arr) => sum + arr.length, 0)}`)

  if (faltasByPlayer.size > 0) {
    console.log('\nTabla de Faltas:\n')
    console.log('Jugador                     | Faltas | Fechas')
    console.log('----------------------------|--------|---------------------------')

    Array.from(faltasByPlayer.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([playerId, dates]) => {
        const player = registeredPlayers.find(p => p.id === playerId)!
        const name = `${player.firstName} ${player.lastName}`
        const count = dates.length
        const datesStr = dates.join(', ')
        console.log(`${name.padEnd(27)} | ${count.toString().padStart(6)} | ${datesStr}`)
      })
  }

  // Análisis de playerIds por fecha
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('ANÁLISIS DE PLAYERIDS POR FECHA')
  console.log('═══════════════════════════════════════════════════════\n')

  for (const gd of gameDates) {
    const totalInPlayerIds = gd.playerIds.length
    const elimsForDate = allEliminations.filter(e => e.gameDateId === gd.id).length
    const registeredInPlayerIds = gd.playerIds.filter(id => registeredIds.has(id)).length

    console.log(`Fecha ${gd.dateNumber}:`)
    console.log(`  Total en playerIds: ${totalInPlayerIds}`)
    console.log(`  Registrados en playerIds: ${registeredInPlayerIds}`)
    console.log(`  Total eliminaciones: ${elimsForDate}`)
    console.log(`  Diferencia: ${totalInPlayerIds - elimsForDate} (sin eliminación)`)
  }

  await prisma.$disconnect()
}

detailedFaltasCheck().catch(console.error)
