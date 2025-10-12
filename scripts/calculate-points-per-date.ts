import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function calculatePointsPerDate() {
  console.log('🔍 Calculando puntos por jugador por fecha...\n')

  const tournamentId = 1 // T28

  // Obtener todas las fechas
  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { position: 'desc' } // Orden: último eliminado primero
      }
    },
    orderBy: { dateNumber: 'asc' }
  })

  console.log('═══════════════════════════════════════════════════════')
  console.log('ANÁLISIS: Fecha 1')
  console.log('═══════════════════════════════════════════════════════')

  const fecha1 = gameDates[0]
  console.log(`Jugadores registrados: ${fecha1.playerIds.length}`)
  console.log(`Eliminaciones: ${fecha1.eliminations.length}`)

  // Los puntos de cada eliminación
  console.log('\nEliminaciones (de último a primero):')
  fecha1.eliminations.forEach((e, i) => {
    console.log(`  ${i + 1}. Pos ${e.position}: ${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName} (${e.eliminatedPlayer.role}) - ${e.points} pts`)
  })

  // El ganador es quien NO está en las eliminaciones
  const eliminatedIds = new Set(fecha1.eliminations.map(e => e.eliminatedPlayerId))
  const winnerIds = fecha1.playerIds.filter(id => !eliminatedIds.has(id))

  console.log(`\n🏆 Ganador(es) no eliminado(s): ${winnerIds.length}`)

  if (winnerIds.length > 0) {
    const winners = await prisma.player.findMany({
      where: {
        id: { in: winnerIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      }
    })

    winners.forEach(w => {
      console.log(`  - ${w.firstName} ${w.lastName} (${w.role})`)
    })

    // Calcular puntos del ganador
    const totalPlayers = fecha1.playerIds.length
    const winnerPoints = totalPlayers * 3 - 3 // Fórmula ELIMINA 2 para 1er lugar

    console.log(`\nPuntos del ganador (${totalPlayers} jugadores): ${winnerPoints} pts`)
  }

  // Resumen de TODOS los jugadores de la fecha
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('RESUMEN COMPLETO - FECHA 1')
  console.log('═══════════════════════════════════════════════════════')

  const allPlayersF1 = await prisma.player.findMany({
    where: {
      id: { in: fecha1.playerIds }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true
    }
  })

  // Crear mapa de puntos
  const pointsMap = new Map<string, { player: any; points: number; position: number }>()

  // Agregar eliminados
  fecha1.eliminations.forEach(e => {
    pointsMap.set(e.eliminatedPlayerId, {
      player: e.eliminatedPlayer,
      points: e.points,
      position: e.position
    })
  })

  // Agregar ganador(es)
  const totalPlayers = fecha1.playerIds.length
  const winnerPoints = totalPlayers * 3 - 3

  winnerIds.forEach(async (winnerId) => {
    const winner = allPlayersF1.find(p => p.id === winnerId)
    if (winner) {
      pointsMap.set(winnerId, {
        player: winner,
        points: winnerPoints,
        position: 1
      })
    }
  })

  // Mostrar todos ordenados por posición
  const sorted = Array.from(pointsMap.values()).sort((a, b) => a.position - b.position)

  console.log('\nTodos los jugadores (ordenados por posición):')
  sorted.forEach(({ player, points, position }) => {
    console.log(`  ${position}. ${player.firstName} ${player.lastName} (${player.role}) - ${points} pts`)
  })

  // Verificar jugadores sin puntos (faltas)
  const playersWithPoints = new Set(pointsMap.keys())
  const playersWithoutPoints = allPlayersF1.filter(p => !playersWithPoints.has(p.id))

  if (playersWithoutPoints.length > 0) {
    console.log('\n❌ Jugadores registrados pero sin puntos (faltas):')
    playersWithoutPoints.forEach(p => {
      console.log(`  - ${p.firstName} ${p.lastName} (${p.role}) - 0 pts`)
    })
  }

  // Análisis general de todas las fechas
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('ANÁLISIS GENERAL - TODAS LAS FECHAS')
  console.log('═══════════════════════════════════════════════════════')

  for (const gd of gameDates) {
    const eliminatedIdsInDate = new Set(gd.eliminations.map(e => e.eliminatedPlayerId))
    const winners = gd.playerIds.filter(id => !eliminatedIdsInDate.has(id))
    const totalPlayersInDate = gd.playerIds.length
    const elimsCount = gd.eliminations.length

    console.log(`\nFecha ${gd.dateNumber}:`)
    console.log(`  Total jugadores: ${totalPlayersInDate}`)
    console.log(`  Eliminaciones: ${elimsCount}`)
    console.log(`  Ganadores: ${winners.length}`)

    if (winners.length === 0 && elimsCount > 0) {
      console.log(`  ⚠️  Sin ganador identificado (todos están eliminados)`)
    } else if (winners.length > 1) {
      console.log(`  ⚠️  Múltiples ganadores: ${winners.length}`)
    }
  }

  await prisma.$disconnect()
}

calculatePointsPerDate().catch(console.error)
