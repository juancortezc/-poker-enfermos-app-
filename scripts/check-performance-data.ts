import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPerformanceData() {
  console.log('🔍 VERIFICACIÓN DE DATOS DE PERFORMANCE POR FECHA\n')

  const tournamentId = 1

  // Verificar TournamentRanking (aquí está la data de performance)
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

  console.log(`Total registros en TournamentRanking: ${rankings.length}\n`)

  if (rankings.length === 0) {
    console.log('⚠️  TournamentRanking está VACÍO')
    console.log('   Necesitamos calcular los puntos por fecha de otra manera\n')
  }

  // Buscar Javier Martinez específicamente
  const javierRankings = rankings.filter(r =>
    r.player.firstName === 'Javier' && r.player.lastName === 'Martinez'
  )

  console.log('═══════════════════════════════════════════════════════')
  console.log('JAVIER MARTINEZ - Performance por Fecha')
  console.log('═══════════════════════════════════════════════════════\n')

  if (javierRankings.length > 0) {
    console.log('Desde TournamentRanking:')
    javierRankings.forEach(r => {
      console.log(`  Fecha ${r.gameDate.dateNumber}: ${r.accumulatedPoints} pts acumulados, Rank: ${r.rankingPosition}`)
    })
  } else {
    console.log('No hay datos en TournamentRanking para Javier Martinez')
  }

  // Verificar en Eliminations
  const javierElims = await prisma.elimination.findMany({
    where: {
      eliminatedPlayer: {
        firstName: 'Javier',
        lastName: 'Martinez'
      },
      gameDate: {
        tournamentId
      }
    },
    include: {
      gameDate: {
        select: {
          dateNumber: true
        }
      }
    },
    orderBy: {
      gameDate: {
        dateNumber: 'asc'
      }
    }
  })

  console.log('\nDesde Eliminations:')
  javierElims.forEach(e => {
    console.log(`  Fecha ${e.gameDate.dateNumber}: ${e.points} pts, Posición: ${e.position}`)
  })

  // Verificar en qué fechas está registrado vs cuáles jugó
  const allDates = await prisma.gameDate.findMany({
    where: { tournamentId },
    select: {
      id: true,
      dateNumber: true
    },
    orderBy: { dateNumber: 'asc' }
  })

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: {
        where: {
          player: {
            firstName: 'Javier',
            lastName: 'Martinez'
          }
        }
      }
    }
  })

  const isRegistered = tournament?.tournamentParticipants.length! > 0

  console.log(`\n¿Javier está registrado en T28?: ${isRegistered ? 'SÍ' : 'NO'}`)

  console.log('\nAnálisis completo de las 12 fechas:')
  console.log('\nFecha | En Elims | Puntos | ¿Debería tener 0?')
  console.log('------|----------|--------|------------------')

  allDates.forEach(gd => {
    const elimination = javierElims.find(e => e.gameDateId === gd.id)
    const inElims = elimination ? 'SÍ' : 'NO'
    const points = elimination ? elimination.points.toString() : '0'
    const shouldHaveZero = !elimination && isRegistered ? 'SÍ (FALTA)' : 'No'

    console.log(`${gd.dateNumber.toString().padStart(5)} | ${inElims.padEnd(8)} | ${points.padStart(6)} | ${shouldHaveZero}`)
  })

  // Ahora verificar TODOS los jugadores registrados
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('TODOS LOS JUGADORES REGISTRADOS - Búsqueda de Faltas')
  console.log('═══════════════════════════════════════════════════════\n')

  const registeredPlayers = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })

  const faltasByPlayer = new Map<string, number[]>()

  for (const tp of registeredPlayers) {
    const player = tp.player

    // Obtener eliminaciones del jugador
    const eliminations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: player.id,
        gameDate: {
          tournamentId
        }
      },
      select: {
        gameDateId: true,
        points: true
      }
    })

    const elimsByDate = new Map(eliminations.map(e => [e.gameDateId, e.points]))
    const faltas: number[] = []

    // Para cada fecha, verificar si jugó
    for (const gd of allDates) {
      const points = elimsByDate.get(gd.id)

      if (points === undefined) {
        // No tiene eliminación = falta (0 puntos)
        faltas.push(gd.dateNumber)
      }
    }

    if (faltas.length > 0) {
      faltasByPlayer.set(player.id, faltas)
    }
  }

  console.log('Jugadores con faltas (fechas sin jugar):\n')
  console.log('Jugador                     | Faltas | Fechas')
  console.log('----------------------------|--------|---------------------------')

  Array.from(faltasByPlayer.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([playerId, dates]) => {
      const player = registeredPlayers.find(tp => tp.playerId === playerId)!.player
      const name = `${player.firstName} ${player.lastName}`
      const count = dates.length
      const datesStr = dates.join(', ')
      console.log(`${name.padEnd(27)} | ${count.toString().padStart(6)} | ${datesStr}`)
    })

  console.log(`\nTotal jugadores con faltas: ${faltasByPlayer.size}`)
  console.log(`Total de faltas: ${Array.from(faltasByPlayer.values()).reduce((sum, arr) => sum + arr.length, 0)}`)

  await prisma.$disconnect()
}

checkPerformanceData().catch(console.error)
