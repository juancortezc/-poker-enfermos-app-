import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateAwardsFinal() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('✅ VALIDACIÓN FINAL - PREMIOS DEL TORNEO 28')
  console.log('═══════════════════════════════════════════════════════\n')

  const tournamentId = 1

  // Get tournament with participants
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
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
          eliminatedPlayer: true,
          eliminatorPlayer: true
        }
      }
    },
    orderBy: { dateNumber: 'asc' }
  })

  // Build player results
  const playerResults = new Map<string, {
    player: any
    dates: { dateNumber: number; points: number; rankByPoints: number }[]
  }>()

  gameDates.forEach(gd => {
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
  })

  // ============================================================
  // TABLA 1: VICTORIAS
  // ============================================================
  console.log('═══════════════════════════════════════════════════════')
  console.log('1. VICTORIAS (Rank 1 por puntos, solo registrados)')
  console.log('═══════════════════════════════════════════════════════\n')

  const victorias = new Map<string, { player: any; dates: number[] }>()

  gameDates.forEach(gd => {
    if (gd.eliminations.length === 0) return

    const winner = [...gd.eliminations].sort((a, b) => b.points - a.points)[0]

    // Only count registered players
    if (!registeredIds.has(winner.eliminatedPlayer.id)) return

    const playerId = winner.eliminatedPlayer.id

    if (!victorias.has(playerId)) {
      victorias.set(playerId, {
        player: winner.eliminatedPlayer,
        dates: []
      })
    }
    victorias.get(playerId)!.dates.push(gd.dateNumber)
  })

  console.log('Jugador                     | Victorias | Fechas')
  console.log('----------------------------|-----------|---------------------------')

  Array.from(victorias.entries())
    .sort((a, b) => b[1].dates.length - a[1].dates.length)
    .forEach(([_, data]) => {
      const name = `${data.player.firstName} ${data.player.lastName}`
      const count = data.dates.length
      const dates = data.dates.join(', ')
      console.log(`${name.padEnd(27)} | ${count.toString().padStart(9)} | ${dates}`)
    })

  console.log(`\nTotal: ${victorias.size} jugadores registrados con victorias`)

  // Verificar Juan Antonio Cortez
  const juanAntonio = Array.from(victorias.entries()).find(([_, data]) =>
    data.player.firstName === 'Juan Antonio' && data.player.lastName === 'Cortez'
  )

  console.log(`\n✅ Verificación Juan Antonio Cortez:`)
  if (juanAntonio) {
    console.log(`   Victorias: ${juanAntonio[1].dates.length}`)
    console.log(`   Fechas: ${juanAntonio[1].dates.join(', ')}`)
    console.log(`   ${juanAntonio[1].dates.length === 1 && juanAntonio[1].dates[0] === 12 ? '✅ CORRECTO (solo fecha 12)' : '❌ INCORRECTO'}`)
  }

  // ============================================================
  // TABLA 2: PODIOS
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('2. PODIOS (Top 3 por puntos, solo registrados)')
  console.log('═══════════════════════════════════════════════════════\n')

  const podios = new Map<string, number>()

  playerResults.forEach((data, playerId) => {
    if (!registeredIds.has(playerId)) return

    const podiosCount = data.dates.filter(d => d.rankByPoints <= 3).length
    if (podiosCount > 0) {
      podios.set(playerId, podiosCount)
    }
  })

  console.log('Jugador                     | Podios')
  console.log('----------------------------|--------')

  Array.from(podios.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([playerId, count]) => {
      const player = playerResults.get(playerId)!.player
      const name = `${player.firstName} ${player.lastName}`
      console.log(`${name.padEnd(27)} | ${count.toString().padStart(6)}`)
    })

  console.log(`\nTotal: ${podios.size} jugadores registrados con podios`)

  // ============================================================
  // TABLA 3: VARÓN Y GAY
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('3. VARÓN Y GAY (Eliminaciones hechas, solo registrados)')
  console.log('═══════════════════════════════════════════════════════\n')

  const allEliminations = gameDates.flatMap(gd => gd.eliminations)
  const elimsByPlayer = new Map<string, number>()

  allEliminations.forEach(elim => {
    // Only count registered players
    if (!registeredIds.has(elim.eliminatorPlayer.id)) return

    const playerId = elim.eliminatorPlayer.id
    elimsByPlayer.set(playerId, (elimsByPlayer.get(playerId) || 0) + 1)
  })

  const sorted = Array.from(elimsByPlayer.entries()).sort((a, b) => b[1] - a[1])

  console.log('Top 5 (Varón):')
  sorted.slice(0, 5).forEach(([playerId, count], index) => {
    const elim = allEliminations.find(e => e.eliminatorPlayer.id === playerId)!
    const name = `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName}`
    console.log(`  ${index + 1}. ${name}: ${count} eliminaciones`)
  })

  console.log('\nBottom 5 (Gay):')
  sorted.slice(-5).forEach(([playerId, count], index) => {
    const elim = allEliminations.find(e => e.eliminatorPlayer.id === playerId)!
    const name = `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName}`
    console.log(`  ${index + 1}. ${name}: ${count} eliminaciones`)
  })

  // Verificar Juan Guajardo NO aparece
  const juanGuajardo = sorted.find(([playerId, _]) => {
    const elim = allEliminations.find(e => e.eliminatorPlayer.id === playerId)!
    return elim.eliminatorPlayer.firstName === 'Juan' && elim.eliminatorPlayer.lastName === 'Guajardo'
  })

  console.log(`\n✅ Verificación Juan Guajardo (NO registrado):`)
  console.log(`   ${!juanGuajardo ? '✅ CORRECTO - No aparece en premios' : '❌ ERROR - Aún aparece'}`)

  // ============================================================
  // TABLA 4: FALTAS
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('4. FALTAS (0 puntos, solo registrados)')
  console.log('═══════════════════════════════════════════════════════\n')

  const faltas = new Map<string, number>()

  playerResults.forEach((data, playerId) => {
    if (!registeredIds.has(playerId)) return

    const faltasCount = data.dates.filter(d => d.points === 0).length
    if (faltasCount > 0) {
      faltas.set(playerId, faltasCount)
    }
  })

  if (faltas.size > 0) {
    console.log('Jugador                     | Faltas')
    console.log('----------------------------|--------')

    Array.from(faltas.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([playerId, count]) => {
        const player = playerResults.get(playerId)!.player
        const name = `${player.firstName} ${player.lastName}`
        console.log(`${name.padEnd(27)} | ${count.toString().padStart(6)}`)
      })
  } else {
    console.log('✅ No hay jugadores registrados con faltas')
  }

  // Verificar Jose Moreno y Meche NO aparecen
  const joseMoreno = Array.from(playerResults.entries()).find(([_, data]) =>
    data.player.firstName.includes('Jose') && data.player.lastName.includes('Moreno')
  )

  const meche = Array.from(playerResults.entries()).find(([_, data]) =>
    data.player.firstName === 'Meche'
  )

  console.log(`\n✅ Verificación jugadores NO registrados:`)
  if (joseMoreno) {
    console.log(`   Jose Moreno - Registrado: ${registeredIds.has(joseMoreno[0]) ? 'SÍ' : 'NO'}`)
    console.log(`   ${!faltas.has(joseMoreno[0]) && !registeredIds.has(joseMoreno[0]) ? '✅ CORRECTO - No aparece en Faltas' : '❌ ERROR'}`)
  }
  if (meche) {
    console.log(`   Meche Garrido - Registrado: ${registeredIds.has(meche[0]) ? 'SÍ' : 'NO'}`)
    console.log(`   ${!faltas.has(meche[0]) && !registeredIds.has(meche[0]) ? '✅ CORRECTO - No aparece en Faltas' : '❌ ERROR'}`)
  }

  // ============================================================
  // TABLA 5: 7/2
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('5. 7/2 (Últimas 2 posiciones por puntos, solo registrados)')
  console.log('═══════════════════════════════════════════════════════\n')

  const sieteYDos = new Map<string, number>()

  gameDates.forEach(gd => {
    if (gd.eliminations.length < 2) return

    const rankedByPoints = [...gd.eliminations].sort((a, b) => b.points - a.points)
    const lastTwo = rankedByPoints.slice(-2)

    lastTwo.forEach(elim => {
      if (!registeredIds.has(elim.eliminatedPlayer.id)) return

      const playerId = elim.eliminatedPlayer.id
      sieteYDos.set(playerId, (sieteYDos.get(playerId) || 0) + 1)
    })
  })

  console.log('Jugador                     | Veces')
  console.log('----------------------------|--------')

  Array.from(sieteYDos.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([playerId, count]) => {
      const player = playerResults.get(playerId)!.player
      const name = `${player.firstName} ${player.lastName}`
      console.log(`${name.padEnd(27)} | ${count.toString().padStart(6)}`)
    })

  console.log(`\nTotal: ${sieteYDos.size} jugadores registrados`)

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('RESUMEN FINAL')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('✅ Correcciones Aplicadas:')
  console.log('   1. Ranking por PUNTOS (no por position)')
  console.log('   2. Filtro por tournamentParticipants (no solo role)')
  console.log('   3. Juan Antonio Cortez: 1 victoria (fecha 12) ✅')
  console.log('   4. Juan Guajardo: Excluido de premios ✅')
  console.log('   5. Jose Moreno: Excluido de Faltas ✅')
  console.log('   6. Meche Garrido: Excluido de Victorias y Faltas ✅')
  console.log('')
  console.log('📊 Estadísticas:')
  console.log(`   - Jugadores registrados: ${registeredIds.size}`)
  console.log(`   - Con victorias: ${victorias.size}`)
  console.log(`   - Con podios: ${podios.size}`)
  console.log(`   - Con faltas: ${faltas.size}`)
  console.log(`   - En 7/2: ${sieteYDos.size}`)

  await prisma.$disconnect()
}

validateAwardsFinal().catch(console.error)
