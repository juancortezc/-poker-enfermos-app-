import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFaltasFinal() {
  console.log('✅ TEST FINAL - FALTAS\n')

  const tournamentId = 1

  // Simular la lógica del API
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      number: true,
      name: true,
      tournamentParticipants: {
        select: {
          playerId: true
        }
      }
    }
  })

  const registeredPlayerIds = new Set(
    tournament?.tournamentParticipants.map(tp => tp.playerId) || []
  )

  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: true,
          eliminatorPlayer: true
        }
      }
    }
  })

  // Build player results
  const playerResults = new Map<string, {
    player: any
    dates: { dateNumber: number; points: number; rankByPoints: number }[]
  }>()

  for (const gd of gameDates) {
    const rankedByPoints = [...gd.eliminations].sort((a, b) => b.points - a.points)

    rankedByPoints.forEach((elim, index) => {
      const playerId = elim.eliminatedPlayer.id
      const rankByPoints = index + 1

      if (!playerResults.has(playerId)) {
        playerResults.set(playerId, {
          player: elim.eliminatedPlayer,
          dates: []
        })
      }

      playerResults.get(playerId)!.dates.push({
        dateNumber: gd.dateNumber,
        points: elim.points,
        rankByPoints
      })
    })
  }

  // FALTAS calculation (nueva lógica)
  const faltasByPlayer = new Map<string, { player: any; count: number }>()

  const registeredParticipants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true
        }
      }
    }
  })

  for (const tp of registeredParticipants) {
    const player = tp.player
    const playerId = player.id

    const datesPlayed = new Set(
      playerResults.get(playerId)?.dates.map(d => d.dateNumber) || []
    )

    const faltasCount = gameDates.length - datesPlayed.size

    if (faltasCount > 0) {
      faltasByPlayer.set(playerId, {
        player,
        count: faltasCount
      })
    }
  }

  const faltas = Array.from(faltasByPlayer.values()).sort((a, b) => b.count - a.count)

  console.log('═══════════════════════════════════════════════════════')
  console.log('RESULTADOS - FALTAS')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('Jugador                     | Faltas')
  console.log('----------------------------|--------')

  faltas.forEach(f => {
    const name = `${f.player.firstName} ${f.player.lastName}`
    console.log(`${name.padEnd(27)} | ${f.count.toString().padStart(6)}`)
  })

  console.log(`\nTotal jugadores con faltas: ${faltas.size}`)

  // Verificar Javier Martinez
  const javier = faltas.find(f =>
    f.player.firstName === 'Javier' && f.player.lastName === 'Martinez'
  )

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('VERIFICACIÓN: JAVIER MARTINEZ')
  console.log('═══════════════════════════════════════════════════════\n')

  if (javier) {
    console.log(`✅ Faltas encontradas: ${javier.count}`)
    console.log(`   Esperado: 2 (fechas 1 y 9)`)
    console.log(`   ${javier.count === 2 ? '✅ CORRECTO' : '❌ INCORRECTO'}`)

    // Mostrar qué fechas jugó
    const javierResults = playerResults.get(javier.player.id)
    if (javierResults) {
      const datesPlayed = javierResults.dates.map(d => d.dateNumber).sort((a, b) => a - b)
      console.log(`\n   Fechas jugadas: ${datesPlayed.join(', ')}`)

      const allDates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      const datesMissed = allDates.filter(d => !datesPlayed.includes(d))
      console.log(`   Fechas faltadas: ${datesMissed.join(', ')}`)
    }
  } else {
    console.log('❌ Javier Martinez NO encontrado en faltas')
  }

  // Tabla detallada
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('TABLA DETALLADA - TOP 10 FALTAS')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('Jugador                     | Faltas | Fechas Jugadas')
  console.log('----------------------------|--------|---------------------------')

  faltas.slice(0, 10).forEach(f => {
    const name = `${f.player.firstName} ${f.player.lastName}`
    const playerData = playerResults.get(f.player.id)
    const datesPlayed = playerData?.dates.map(d => d.dateNumber).sort((a, b) => a - b).join(', ') || 'ninguna'

    console.log(`${name.padEnd(27)} | ${f.count.toString().padStart(6)} | ${datesPlayed}`)
  })

  await prisma.$disconnect()
}

testFaltasFinal().catch(console.error)
