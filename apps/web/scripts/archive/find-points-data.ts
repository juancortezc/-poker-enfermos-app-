import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findPointsData() {
  console.log('🔍 Buscando dónde están los puntos por fecha...\n')

  const tournamentId = 1 // T28

  // 1. Verificar TournamentRanking
  console.log('═══════════════════════════════════════════════════════')
  console.log('1. TOURNAMENT RANKING')
  console.log('═══════════════════════════════════════════════════════')

  const rankings = await prisma.tournamentRanking.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          role: true
        }
      },
      gameDate: {
        select: {
          dateNumber: true
        }
      }
    },
    orderBy: [
      { gameDateId: 'asc' },
      { rankingPosition: 'asc' }
    ]
  })

  console.log(`Total registros en TournamentRanking: ${rankings.length}`)

  if (rankings.length > 0) {
    console.log('\nEjemplo - Fecha 1, Top 5:')
    rankings
      .filter(r => r.gameDate.dateNumber === 1)
      .slice(0, 5)
      .forEach(r => {
        console.log(`  Pos ${r.rankingPosition}: ${r.player.firstName} ${r.player.lastName} - ${r.accumulatedPoints} pts acumulados`)
        console.log(`    Posiciones de eliminación: [${r.eliminationPositions.join(', ')}]`)
      })

    // Agrupar por fecha para ver cuántos jugadores hay por fecha
    const byDate = new Map<number, number>()
    rankings.forEach(r => {
      const dateNum = r.gameDate.dateNumber
      byDate.set(dateNum, (byDate.get(dateNum) || 0) + 1)
    })

    console.log('\nJugadores registrados por fecha en TournamentRanking:')
    Array.from(byDate.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([dateNum, count]) => {
        console.log(`  Fecha ${dateNum}: ${count} jugadores`)
      })
  }

  // 2. Verificar Eliminations para contar jugadores por fecha
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('2. ELIMINATIONS - Jugadores por fecha')
  console.log('═══════════════════════════════════════════════════════')

  const eliminations = await prisma.elimination.findMany({
    where: {
      gameDate: { tournamentId }
    },
    include: {
      gameDate: {
        select: {
          dateNumber: true
        }
      }
    }
  })

  const elimsByDate = new Map<number, number>()
  eliminations.forEach(e => {
    const dateNum = e.gameDate.dateNumber
    elimsByDate.set(dateNum, (elimsByDate.get(dateNum) || 0) + 1)
  })

  console.log('Eliminaciones por fecha:')
  Array.from(elimsByDate.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([dateNum, count]) => {
      console.log(`  Fecha ${dateNum}: ${count} eliminaciones (${count + 1} jugadores)`)
    })

  // 3. Verificar GameDate para ver participantes
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('3. GAME DATES - Player IDs')
  console.log('═══════════════════════════════════════════════════════')

  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId },
    select: {
      dateNumber: true,
      playerIds: true,
      status: true
    },
    orderBy: { dateNumber: 'asc' }
  })

  console.log('Jugadores registrados en GameDate.playerIds:')
  gameDates.forEach(gd => {
    console.log(`  Fecha ${gd.dateNumber}: ${gd.playerIds.length} jugadores (${gd.status})`)
  })

  // 4. Analizar la estructura de TournamentRanking para entender cómo se calculan los puntos
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('4. ANÁLISIS DE PUNTOS EN TOURNAMENT RANKING')
  console.log('═══════════════════════════════════════════════════════')

  if (rankings.length > 0) {
    // Tomar fecha 1 como ejemplo
    const fecha1 = rankings.filter(r => r.gameDate.dateNumber === 1)

    console.log('\nFecha 1 - Todos los jugadores:')
    fecha1.forEach(r => {
      const elimPositions = r.eliminationPositions.join(', ') || 'ninguna'
      console.log(`  ${r.rankingPosition}. ${r.player.firstName} ${r.player.lastName} (${r.player.role})`)
      console.log(`     Puntos acum: ${r.accumulatedPoints}, Posiciones elim: [${elimPositions}]`)
    })

    // Intentar entender si hay puntos individuales por fecha
    console.log('\n¿Cómo se calculan los puntos de la fecha?')
    console.log('Los puntos en TournamentRanking son ACUMULADOS, no por fecha individual.')
    console.log('Necesitamos otra fuente para puntos POR FECHA.')
  }

  // 5. Buscar en GameResult (aunque sabemos que está vacío)
  const gameResults = await prisma.gameResult.findMany({
    where: {
      gameDate: { tournamentId }
    }
  })

  console.log(`\n═══════════════════════════════════════════════════════`)
  console.log(`GameResults: ${gameResults.length} registros`)
  console.log(`═══════════════════════════════════════════════════════`)

  // 6. CONCLUSIÓN
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('CONCLUSIÓN')
  console.log('═══════════════════════════════════════════════════════')

  console.log(`
📊 Fuentes de datos disponibles:
  1. TournamentRanking: ${rankings.length} registros
     - Tiene puntos ACUMULADOS
     - Tiene posiciones de eliminación por fecha
     - Tiene jugadores por fecha

  2. Eliminations: ${eliminations.length} registros
     - Tiene posición de eliminación
     - Tiene puntos de cada eliminación
     - Tiene jugador eliminado y eliminador

  3. GameDate.playerIds: Lista de jugadores por fecha

  4. GameResult: ${gameResults.length} registros ❌ VACÍO

💡 SOLUCIÓN:
  Para obtener puntos POR FECHA necesitamos:
  - Calcular puntos individuales desde TournamentRanking
  - O usar Eliminations.points directamente
  - O calcular desde eliminationPositions en cada fecha

  ¿Eliminations tiene el campo 'points'?
  `)

  // 7. Verificar estructura de Eliminations
  if (eliminations.length > 0) {
    console.log('\nEstructura de Elimination (primer registro):')
    const first = eliminations[0]
    console.log(JSON.stringify(first, null, 2))
  }

  await prisma.$disconnect()
}

findPointsData().catch(console.error)
