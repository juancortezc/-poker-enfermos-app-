import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeAwardsData() {
  console.log('🔍 Analizando datos para Premios del Torneo 28...\n')

  const tournamentId = 1 // T28

  // 1. Analizar Eliminaciones
  console.log('═══════════════════════════════════════════════════════')
  console.log('1. ELIMINACIONES (Varón/Gay)')
  console.log('═══════════════════════════════════════════════════════')

  const eliminations = await prisma.elimination.findMany({
    where: {
      gameDate: {
        tournamentId
      }
    },
    include: {
      eliminatorPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  })

  console.log(`Total eliminaciones: ${eliminations.length}`)

  const eliminationsByPlayer = new Map<string, { player: any; count: number; role: string }>()
  eliminations.forEach(elim => {
    const playerId = elim.eliminatorPlayer.id
    if (!eliminationsByPlayer.has(playerId)) {
      eliminationsByPlayer.set(playerId, {
        player: elim.eliminatorPlayer,
        count: 0,
        role: elim.eliminatorPlayer.role
      })
    }
    eliminationsByPlayer.get(playerId)!.count++
  })

  const sorted = Array.from(eliminationsByPlayer.values()).sort((a, b) => b.count - a.count)

  console.log('\nTop 10 eliminadores:')
  sorted.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.player.firstName} ${p.player.lastName} (${p.role}): ${p.count} eliminaciones`)
  })

  console.log('\nBottom 10 eliminadores:')
  sorted.slice(-10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.player.firstName} ${p.player.lastName} (${p.role}): ${p.count} eliminaciones`)
  })

  const invitadosConElims = sorted.filter(p => p.role === 'Invitado')
  console.log(`\n⚠️  Invitados que eliminaron: ${invitadosConElims.length}`)
  invitadosConElims.forEach(p => {
    console.log(`  - ${p.player.firstName} ${p.player.lastName}: ${p.count} eliminaciones`)
  })

  // 2. Analizar Game Results
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('2. GAME RESULTS (Podios, 7/2, Victorias, etc.)')
  console.log('═══════════════════════════════════════════════════════')

  const gameResults = await prisma.gameResult.findMany({
    where: {
      gameDate: {
        tournamentId
      }
    },
    include: {
      player: {
        select: {
          id: true,
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
    }
  })

  console.log(`Total game results: ${gameResults.length}`)

  // Analizar distribución de puntos
  const pointsDistribution = new Map<number, number>()
  gameResults.forEach(result => {
    const points = result.points
    pointsDistribution.set(points, (pointsDistribution.get(points) || 0) + 1)
  })

  console.log('\nDistribución de puntos:')
  Array.from(pointsDistribution.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([points, count]) => {
      console.log(`  ${points} puntos: ${count} registros`)
    })

  // Podios (≥24 puntos)
  const podios = gameResults.filter(r => r.points >= 24)
  console.log(`\n✓ Podios (≥24 pts): ${podios.length}`)

  const podiosByPlayer = new Map<string, number>()
  podios.forEach(p => {
    podiosByPlayer.set(p.player.id, (podiosByPlayer.get(p.player.id) || 0) + 1)
  })
  console.log(`  Jugadores únicos en podio: ${podiosByPlayer.size}`)

  // Victorias (30 puntos)
  const victorias = gameResults.filter(r => r.points === 30)
  console.log(`\n✓ Victorias (30 pts): ${victorias.length}`)

  const victoriasByPlayer = new Map<string, number>()
  victorias.forEach(v => {
    victoriasByPlayer.set(v.player.id, (victoriasByPlayer.get(v.player.id) || 0) + 1)
  })
  console.log(`  Jugadores únicos con victorias: ${victoriasByPlayer.size}`)

  // 7/2 (≤2 puntos)
  const sieteYDos = gameResults.filter(r => r.points <= 2)
  console.log(`\n✓ 7/2 (≤2 pts): ${sieteYDos.length}`)

  const sieteYDosByPlayer = new Map<string, number>()
  sieteYDos.forEach(s => {
    sieteYDosByPlayer.set(s.player.id, (sieteYDosByPlayer.get(s.player.id) || 0) + 1)
  })
  console.log(`  Jugadores únicos en 7/2: ${sieteYDosByPlayer.size}`)

  // Mesas finales (≥8 puntos - top 9)
  const mesasFinales = gameResults.filter(r => r.points >= 8)
  console.log(`\n✓ Mesas Finales (≥8 pts): ${mesasFinales.length}`)

  const mesasFinalesByPlayer = new Map<string, number>()
  mesasFinales.forEach(m => {
    mesasFinalesByPlayer.set(m.player.id, (mesasFinalesByPlayer.get(m.player.id) || 0) + 1)
  })
  console.log(`  Jugadores únicos en mesas finales: ${mesasFinalesByPlayer.size}`)

  // Faltas (0 puntos)
  const faltas = gameResults.filter(r => r.points === 0)
  console.log(`\n✓ Faltas (0 pts): ${faltas.length}`)

  const faltasByPlayer = new Map<string, { count: number; role: string }>()
  faltas.forEach(f => {
    faltasByPlayer.set(f.player.id, {
      count: (faltasByPlayer.get(f.player.id)?.count || 0) + 1,
      role: f.player.role
    })
  })

  const faltasRegistrados = Array.from(faltasByPlayer.entries()).filter(([_, data]) => data.role !== 'Invitado')
  console.log(`  Jugadores registrados con faltas: ${faltasRegistrados.length}`)

  // 3. Analizar fechas jugadas
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('3. FECHAS DEL TORNEO')
  console.log('═══════════════════════════════════════════════════════')

  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId },
    select: {
      id: true,
      dateNumber: true,
      status: true,
      _count: {
        select: {
          gameResults: true,
          eliminations: true
        }
      }
    },
    orderBy: { dateNumber: 'asc' }
  })

  console.log(`Total fechas programadas: ${gameDates.length}`)

  const fechasCompletadas = gameDates.filter(gd => gd._count.gameResults > 0)
  console.log(`Fechas con resultados: ${fechasCompletadas.length}`)

  console.log('\nDetalle por fecha:')
  gameDates.forEach(gd => {
    console.log(`  Fecha ${gd.dateNumber}: ${gd._count.gameResults} resultados, ${gd._count.eliminations} eliminaciones (${gd.status})`)
  })

  // 4. Sin Podio
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('4. SIN PODIO')
  console.log('═══════════════════════════════════════════════════════')

  const allPlayers = new Set<string>()
  const playersWithPodio = new Set<string>()

  gameResults.forEach(result => {
    allPlayers.add(result.player.id)
    if (result.points >= 24) {
      playersWithPodio.add(result.player.id)
    }
  })

  const playersNeverPodio = Array.from(allPlayers).filter(id => !playersWithPodio.has(id))

  const sinPodioPlayers = await prisma.player.findMany({
    where: {
      id: { in: playersNeverPodio },
      role: { not: 'Invitado' }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true
    }
  })

  console.log(`Jugadores que nunca estuvieron en podio: ${sinPodioPlayers.length}`)
  sinPodioPlayers.forEach(p => {
    console.log(`  - ${p.firstName} ${p.lastName} (${p.role})`)
  })

  // 5. Resumen
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('5. RESUMEN DE DATOS DISPONIBLES')
  console.log('═══════════════════════════════════════════════════════')

  console.log(`
✅ Datos disponibles:
  - Eliminaciones: ${eliminations.length} registros
  - Game Results: ${gameResults.length} registros
  - Fechas completadas: ${fechasCompletadas.length}/12

✅ Awards con datos:
  - Varón: ${sorted.length > 0 ? 'SÍ' : 'NO'}
  - Gay: ${sorted.length > 0 ? 'SÍ' : 'NO'}
  - Podios: ${podiosByPlayer.size > 0 ? 'SÍ' : 'NO'}
  - Victorias: ${victoriasByPlayer.size > 0 ? 'SÍ' : 'NO'}
  - 7/2: ${sieteYDosByPlayer.size > 0 ? 'SÍ' : 'NO'}
  - Mesas Finales: ${mesasFinalesByPlayer.size > 0 ? 'SÍ' : 'NO'}
  - Faltas: ${faltasRegistrados.length > 0 ? 'SÍ' : 'NO'}
  - Sin Podio: ${sinPodioPlayers.length > 0 ? 'SÍ' : 'NO'}

⚠️  Problemas detectados:
  ${invitadosConElims.length > 0 ? `- Invitados aparecen en Varón/Gay (${invitadosConElims.length} invitados)` : '- Sin invitados en eliminaciones ✓'}
  - Verificar si hay suficientes datos para cada premio
  `)

  await prisma.$disconnect()
}

analyzeAwardsData().catch(console.error)
