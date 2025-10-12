import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateFaltas() {
  console.log('🔍 INVESTIGACIÓN DE FALTAS - Jugadores con 0 puntos\n')

  const tournamentId = 1

  // Get tournament participants
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

  const registeredIds = new Set(tournament?.tournamentParticipants.map(tp => tp.playerId) || [])

  console.log(`Jugadores registrados en T28: ${registeredIds.size}\n`)

  // Get all game dates
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
        }
      }
    },
    orderBy: { dateNumber: 'asc' }
  })

  console.log('═══════════════════════════════════════════════════════')
  console.log('BÚSQUEDA DE JUGADORES CON 0 PUNTOS EN ELIMINATIONS')
  console.log('═══════════════════════════════════════════════════════\n')

  let totalFaltas = 0
  const faltasByPlayer = new Map<string, { player: any; dates: number[] }>()

  gameDates.forEach(gd => {
    // Buscar eliminaciones con 0 puntos
    const zeroPoints = gd.eliminations.filter(e => e.points === 0)

    if (zeroPoints.length > 0) {
      console.log(`\nFecha ${gd.dateNumber}: ${zeroPoints.length} jugador(es) con 0 puntos`)

      zeroPoints.forEach(elim => {
        const player = elim.eliminatedPlayer
        const isRegistered = registeredIds.has(player.id)

        console.log(`  - ${player.firstName} ${player.lastName} (${player.role}) ${isRegistered ? '✅ Registrado' : '❌ NO Registrado'}`)

        if (isRegistered) {
          totalFaltas++

          if (!faltasByPlayer.has(player.id)) {
            faltasByPlayer.set(player.id, {
              player,
              dates: []
            })
          }
          faltasByPlayer.get(player.id)!.dates.push(gd.dateNumber)
        }
      })
    }
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('BÚSQUEDA EN PLAYERIDS SIN ELIMINATION (Falta por ausencia)')
  console.log('═══════════════════════════════════════════════════════\n')

  let faltasPorAusencia = 0

  for (const gd of gameDates) {
    const eliminatedPlayerIds = new Set(gd.eliminations.map(e => e.eliminatedPlayerId))
    const faltasIds = gd.playerIds.filter(id => !eliminatedPlayerIds.has(id))

    if (faltasIds.length > 0) {
      console.log(`\nFecha ${gd.dateNumber}: ${faltasIds.length} jugador(es) en playerIds sin eliminación`)

      const faltaPlayers = await prisma.player.findMany({
        where: { id: { in: faltasIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      })

      faltaPlayers.forEach(player => {
        const isRegistered = registeredIds.has(player.id)
        console.log(`  - ${player.firstName} ${player.lastName} (${player.role}) ${isRegistered ? '✅ Registrado' : '❌ NO Registrado'}`)

        if (isRegistered) {
          faltasPorAusencia++

          if (!faltasByPlayer.has(player.id)) {
            faltasByPlayer.set(player.id, {
              player,
              dates: []
            })
          }
          faltasByPlayer.get(player.id)!.dates.push(gd.dateNumber)
        }
      })
    }
  }

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('RESUMEN DE FALTAS - JUGADORES REGISTRADOS')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log(`Total faltas (0 puntos en eliminations): ${totalFaltas}`)
  console.log(`Total faltas (en playerIds sin elimination): ${faltasPorAusencia}`)
  console.log(`Total combinado: ${totalFaltas + faltasPorAusencia}\n`)

  if (faltasByPlayer.size > 0) {
    console.log('Jugadores registrados con faltas:\n')
    console.log('Jugador                     | Faltas | Fechas')
    console.log('----------------------------|--------|---------------------------')

    Array.from(faltasByPlayer.entries())
      .sort((a, b) => b[1].dates.length - a[1].dates.length)
      .forEach(([_, data]) => {
        const name = `${data.player.firstName} ${data.player.lastName}`
        const count = data.dates.length
        const dates = data.dates.join(', ')
        console.log(`${name.padEnd(27)} | ${count.toString().padStart(6)} | ${dates}`)
      })
  } else {
    console.log('⚠️  No se encontraron faltas de jugadores registrados')
  }

  // Verificar algunos jugadores específicos
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('VERIFICACIÓN MANUAL DE ALGUNOS JUGADORES')
  console.log('═══════════════════════════════════════════════════════\n')

  const registeredPlayers = tournament?.tournamentParticipants.map(tp => tp.player) || []

  for (const player of registeredPlayers.slice(0, 5)) {
    console.log(`\n${player.firstName} ${player.lastName}:`)

    for (const gd of gameDates) {
      const elimination = gd.eliminations.find(e => e.eliminatedPlayerId === player.id)

      if (elimination) {
        console.log(`  Fecha ${gd.dateNumber}: ${elimination.points} pts${elimination.points === 0 ? ' ⚠️  FALTA (0 pts)' : ''}`)
      } else {
        const inPlayerIds = gd.playerIds.includes(player.id)
        if (inPlayerIds) {
          console.log(`  Fecha ${gd.dateNumber}: ⚠️  En playerIds pero SIN elimination (FALTA)`)
        }
      }
    }
  }

  await prisma.$disconnect()
}

investigateFaltas().catch(console.error)
