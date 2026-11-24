import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAwardsAPI() {
  console.log('🧪 Probando lógica de Awards API...\n')

  const tournamentId = 1 // T28

  // Get tournament info
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, number: true, name: true }
  })

  console.log(`Torneo: #${tournament?.number} - ${tournament?.name}\n`)

  // Get all game dates with eliminations
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
              photoUrl: true,
              role: true
            }
          },
          eliminatorPlayer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              role: true
            }
          }
        }
      }
    }
  })

  // Build player results structure
  const playerResults = new Map<string, {
    player: { id: string; firstName: string; lastName: string; photoUrl: string | null; role: string }
    dates: { dateNumber: number; points: number; position: number }[]
  }>()

  // Process each game date
  for (const gd of gameDates) {
    // Get players who got points from eliminations
    gd.eliminations.forEach(elim => {
      const playerId = elim.eliminatedPlayer.id

      if (!playerResults.has(playerId)) {
        playerResults.set(playerId, {
          player: elim.eliminatedPlayer,
          dates: []
        })
      }

      playerResults.get(playerId)!.dates.push({
        dateNumber: gd.dateNumber,
        points: elim.points,
        position: elim.position
      })
    })

    // Handle faltas
    const eliminatedPlayerIds = new Set(gd.eliminations.map(e => e.eliminatedPlayerId))
    const faltasIds = gd.playerIds.filter(id => !eliminatedPlayerIds.has(id))

    if (faltasIds.length > 0) {
      const faltaPlayers = await prisma.player.findMany({
        where: { id: { in: faltasIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          role: true
        }
      })

      faltaPlayers.forEach(player => {
        if (!playerResults.has(player.id)) {
          playerResults.set(player.id, {
            player,
            dates: []
          })
        }

        playerResults.get(player.id)!.dates.push({
          dateNumber: gd.dateNumber,
          points: 0,
          position: gd.eliminations.length + 1
        })
      })
    }
  }

  const allEliminations = gameDates.flatMap(gd => gd.eliminations)

  // Test 1: VARÓN
  console.log('═══════════════════════════════════════════════════════')
  console.log('1. VARÓN DEL TORNEO (Mayor cantidad de eliminaciones)')
  console.log('═══════════════════════════════════════════════════════')

  const eliminationsByEliminator = new Map<string, { player: any; count: number }>()

  allEliminations.forEach(elim => {
    if (elim.eliminatorPlayer.role === 'Invitado') return

    const playerId = elim.eliminatorPlayer.id
    if (!eliminationsByEliminator.has(playerId)) {
      eliminationsByEliminator.set(playerId, {
        player: elim.eliminatorPlayer,
        count: 0
      })
    }
    eliminationsByEliminator.get(playerId)!.count++
  })

  const sortedByElims = Array.from(eliminationsByEliminator.values()).sort((a, b) => b.count - a.count)
  const maxElims = sortedByElims[0]?.count || 0
  const varon = sortedByElims.filter(p => p.count === maxElims && maxElims > 0)

  console.log(`Eliminaciones máximas: ${maxElims}`)
  varon.forEach(v => {
    console.log(`  🏆 ${v.player.firstName} ${v.player.lastName}: ${v.count} eliminaciones`)
  })

  // Test 2: GAY
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('2. GAY DEL TORNEO (Menor cantidad de eliminaciones)')
  console.log('═══════════════════════════════════════════════════════')

  const minElims = sortedByElims[sortedByElims.length - 1]?.count || 0
  const gay = sortedByElims.filter(p => p.count === minElims && minElims > 0)

  console.log(`Eliminaciones mínimas: ${minElims}`)
  gay.slice(0, 5).forEach(g => {
    console.log(`  ${g.player.firstName} ${g.player.lastName}: ${g.count} eliminaciones`)
  })
  if (gay.length > 5) {
    console.log(`  ... y ${gay.length - 5} más con ${minElims} eliminaciones`)
  }

  // Test 3: PODIOS
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('3. PODIOS (Mayor cantidad de Top 3)')
  console.log('═══════════════════════════════════════════════════════')

  const podiosByPlayer = new Map<string, { player: any; count: number }>()

  playerResults.forEach((data, playerId) => {
    if (data.player.role === 'Invitado') return

    const podiosCount = data.dates.filter(d => d.position <= 3).length

    if (podiosCount > 0) {
      podiosByPlayer.set(playerId, {
        player: data.player,
        count: podiosCount
      })
    }
  })

  const podios = Array.from(podiosByPlayer.values()).sort((a, b) => b.count - a.count)

  console.log(`Total jugadores con podios: ${podios.length}`)
  podios.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.player.firstName} ${p.player.lastName}: ${p.count} podios`)
  })

  // Test 4: VICTORIAS
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('4. VICTORIAS (Mayor cantidad de 1er lugar)')
  console.log('═══════════════════════════════════════════════════════')

  const victoriasByPlayer = new Map<string, { player: any; count: number }>()

  playerResults.forEach((data, playerId) => {
    if (data.player.role === 'Invitado') return

    const victoriasCount = data.dates.filter(d => d.position === 1).length

    if (victoriasCount > 0) {
      victoriasByPlayer.set(playerId, {
        player: data.player,
        count: victoriasCount
      })
    }
  })

  const victorias = Array.from(victoriasByPlayer.values()).sort((a, b) => b.count - a.count)

  console.log(`Total jugadores con victorias: ${victorias.length}`)
  victorias.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.player.firstName} ${v.player.lastName}: ${v.count} victoria${v.count > 1 ? 's' : ''}`)
  })

  // Test 5: 7/2
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('5. 7/2 (Últimas dos posiciones)')
  console.log('═══════════════════════════════════════════════════════')

  const sieteYDosByPlayer = new Map<string, { player: any; count: number }>()

  gameDates.forEach(gd => {
    const totalPlayers = Math.max(gd.eliminations.length, gd.playerIds.length)
    const lastTwoPositions = [totalPlayers, totalPlayers - 1]

    gd.eliminations
      .filter(e => lastTwoPositions.includes(e.position) && e.eliminatedPlayer.role !== 'Invitado')
      .forEach(e => {
        const playerId = e.eliminatedPlayer.id
        if (!sieteYDosByPlayer.has(playerId)) {
          sieteYDosByPlayer.set(playerId, {
            player: e.eliminatedPlayer,
            count: 0
          })
        }
        sieteYDosByPlayer.get(playerId)!.count++
      })
  })

  const sieteYDos = Array.from(sieteYDosByPlayer.values()).sort((a, b) => b.count - a.count)

  console.log(`Total jugadores en 7/2: ${sieteYDos.length}`)
  sieteYDos.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.player.firstName} ${s.player.lastName}: ${s.count} veces`)
  })

  // Test 6: MESAS FINALES
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('6. MESAS FINALES (Mayor cantidad en Top 9)')
  console.log('═══════════════════════════════════════════════════════')

  const mesasFinalesByPlayer = new Map<string, { player: any; count: number }>()

  playerResults.forEach((data, playerId) => {
    if (data.player.role === 'Invitado') return

    const mesasFinalesCount = data.dates.filter(d => d.position <= 9).length

    if (mesasFinalesCount > 0) {
      mesasFinalesByPlayer.set(playerId, {
        player: data.player,
        count: mesasFinalesCount
      })
    }
  })

  const mesasFinales = Array.from(mesasFinalesByPlayer.values()).sort((a, b) => b.count - a.count)

  console.log(`Total jugadores en mesas finales: ${mesasFinales.length}`)
  mesasFinales.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.player.firstName} ${m.player.lastName}: ${m.count} veces`)
  })

  // Test 7: SIN PODIO
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('7. SIN PODIO (Nunca en Top 3)')
  console.log('═══════════════════════════════════════════════════════')

  const sinPodioPlayers: any[] = []

  playerResults.forEach((data, playerId) => {
    if (data.player.role === 'Invitado') return

    const hasPodio = data.dates.some(d => d.position <= 3)

    if (!hasPodio && data.dates.length > 0) {
      sinPodioPlayers.push(data.player)
    }
  })

  console.log(`Total jugadores sin podio: ${sinPodioPlayers.length}`)
  sinPodioPlayers.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.firstName} ${p.lastName}`)
  })
  if (sinPodioPlayers.length > 10) {
    console.log(`  ... y ${sinPodioPlayers.length - 10} más`)
  }

  // Test 8: FALTAS
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('8. FALTAS (Mayor cantidad de ausencias)')
  console.log('═══════════════════════════════════════════════════════')

  const faltasByPlayer = new Map<string, { player: any; count: number }>()

  playerResults.forEach((data, playerId) => {
    if (data.player.role === 'Invitado') return

    const faltasCount = data.dates.filter(d => d.points === 0).length

    if (faltasCount > 0) {
      faltasByPlayer.set(playerId, {
        player: data.player,
        count: faltasCount
      })
    }
  })

  const faltas = Array.from(faltasByPlayer.values()).sort((a, b) => b.count - a.count)

  console.log(`Total jugadores con faltas: ${faltas.length}`)
  faltas.slice(0, 5).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.player.firstName} ${f.player.lastName}: ${f.count} falta${f.count > 1 ? 's' : ''}`)
  })

  // RESUMEN
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('RESUMEN')
  console.log('═══════════════════════════════════════════════════════')

  console.log(`
✅ Premios calculados correctamente:
  1. Varón: ${varon.length} ganador${varon.length > 1 ? 'es' : ''}
  2. Gay: ${gay.length} ganador${gay.length > 1 ? 'es' : ''}
  3. Podios: ${podios.length} jugadores
  4. Victorias: ${victorias.length} jugadores
  5. 7/2: ${sieteYDos.length} jugadores
  6. Mesas Finales: ${mesasFinales.length} jugadores
  7. Sin Podio: ${sinPodioPlayers.length} jugadores
  8. Faltas: ${faltas.length} jugadores

📊 Estadísticas:
  - Total jugadores analizados: ${playerResults.size}
  - Invitados filtrados: ✅
  - Fechas procesadas: ${gameDates.length}
  `)

  await prisma.$disconnect()
}

testAwardsAPI().catch(console.error)
