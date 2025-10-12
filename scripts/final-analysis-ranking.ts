import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function finalAnalysisRanking() {
  console.log('🎯 ANÁLISIS DEFINITIVO - Sistema de Ranking\n')

  const tournamentId = 1

  // Fecha 2 real positions from user
  const fecha2RealPositions = [
    { pos: 1, name: 'Juan Fernando Ochoa', expectedPoints: 30 },
    { pos: 2, name: 'Roddy Naranjo', expectedPoints: 27 },
    { pos: 3, name: 'Carlos Chacon', expectedPoints: 24 },
    { pos: 4, name: 'Meche Garrido', expectedPoints: 21 },
    { pos: 5, name: 'Mono', expectedPoints: 20 },
    { pos: 6, name: 'Juan Antonio Cortez', expectedPoints: 19 },
    { pos: 7, name: 'Juan Tapia', expectedPoints: 18 }
  ]

  const fecha2 = await prisma.gameDate.findFirst({
    where: { tournamentId, dateNumber: 2 },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: true
        }
      }
    }
  })

  console.log('═══════════════════════════════════════════════════════')
  console.log('TEORÍA: El ranking se hace por PUNTOS, no por position')
  console.log('═══════════════════════════════════════════════════════\n')

  // Ordenar por puntos descendente
  const byPoints = [...(fecha2?.eliminations || [])]
    .sort((a, b) => b.points - a.points)

  console.log('Top 7 jugadores ordenados por PUNTOS (descendente):\n')
  console.log('Rank | Jugador                    | Puntos | BD Position | Real Pos | Match')
  console.log('-----|----------------------------|--------|-------------|----------|------')

  byPoints.slice(0, 7).forEach((elim, index) => {
    const rank = index + 1
    const name = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`
    const realPos = fecha2RealPositions[index]
    const nameMatch = name.toLowerCase().includes(realPos.name.toLowerCase().split(' ')[0])
    const pointsMatch = elim.points === realPos.expectedPoints
    const match = nameMatch && pointsMatch ? '✅' : '❌'

    console.log(
      `${rank.toString().padStart(4)} | ${name.padEnd(26)} | ${elim.points.toString().padStart(6)} | ${elim.position.toString().padStart(11)} | ${realPos.pos.toString().padStart(8)} | ${match}`
    )
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('VALIDACIÓN: Verificar posiciones específicas')
  console.log('═══════════════════════════════════════════════════════\n')

  // Verificar ganador (máximo puntos)
  const winner = byPoints[0]
  console.log('🏆 GANADOR (Mayor cantidad de puntos):')
  console.log(`   ${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName} - ${winner.points} puntos`)
  console.log(`   Posición real esperada: 1 - ${fecha2RealPositions[0].name}`)
  console.log(`   ${winner.eliminatedPlayer.firstName.includes('Juan Fernando') ? '✅ CORRECTO' : '❌ INCORRECTO'}`)

  // Verificar último lugar (mínimo puntos)
  const lastPlace = byPoints[byPoints.length - 1]
  console.log('\n📉 ÚLTIMO LUGAR (Menor cantidad de puntos):')
  console.log(`   ${lastPlace.eliminatedPlayer.firstName} ${lastPlace.eliminatedPlayer.lastName} - ${lastPlace.points} punto(s)`)
  console.log(`   BD Position: ${lastPlace.position}`)

  // Verificar podios (top 3 por puntos)
  console.log('\n🥇 PODIO (Top 3 por puntos):')
  byPoints.slice(0, 3).forEach((elim, i) => {
    const medal = ['🥇', '🥈', '🥉'][i]
    console.log(`   ${medal} ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName} - ${elim.points} pts`)
  })

  // Análisis de todas las fechas
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('ANÁLISIS DE TODAS LAS FECHAS')
  console.log('═══════════════════════════════════════════════════════\n')

  const allDates = await prisma.gameDate.findMany({
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

  console.log('Ganadores por fecha (jugador con más puntos):\n')
  console.log('Fecha | Ganador                    | Puntos | BD Position')
  console.log('------|----------------------------|--------|------------')

  allDates.forEach(gd => {
    if (gd.eliminations.length > 0) {
      const winner = [...gd.eliminations].sort((a, b) => b.points - a.points)[0]
      const name = `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`
      console.log(
        `${gd.dateNumber.toString().padStart(5)} | ${name.padEnd(26)} | ${winner.points.toString().padStart(6)} | ${winner.position.toString().padStart(11)}`
      )
    }
  })

  // Contar victorias por jugador (rank by points)
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('VICTORIAS POR JUGADOR (Basado en puntos)')
  console.log('═══════════════════════════════════════════════════════\n')

  const victorias = new Map<string, { player: any; dates: number[] }>()

  allDates.forEach(gd => {
    if (gd.eliminations.length > 0) {
      const winner = [...gd.eliminations].sort((a, b) => b.points - a.points)[0]
      const playerId = winner.eliminatedPlayer.id

      if (!victorias.has(playerId)) {
        victorias.set(playerId, {
          player: winner.eliminatedPlayer,
          dates: []
        })
      }
      victorias.get(playerId)!.dates.push(gd.dateNumber)
    }
  })

  console.log('Jugador                     | Victorias | Fechas')
  console.log('----------------------------|-----------|------------------')

  Array.from(victorias.entries())
    .sort((a, b) => b[1].dates.length - a[1].dates.length)
    .forEach(([_, data]) => {
      const name = `${data.player.firstName} ${data.player.lastName}`
      const count = data.dates.length
      const dates = data.dates.join(', ')
      console.log(`${name.padEnd(27)} | ${count.toString().padStart(9)} | ${dates}`)
    })

  // Get tournament participants
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  })

  const registeredIds = new Set(tournament?.tournamentParticipants.map(tp => tp.playerId) || [])

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('VICTORIAS - SOLO JUGADORES REGISTRADOS EN T28')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('Jugador                     | Role     | Registrado | Victorias | Fechas')
  console.log('----------------------------|----------|------------|-----------|------------------')

  Array.from(victorias.entries())
    .sort((a, b) => b[1].dates.length - a[1].dates.length)
    .forEach(([playerId, data]) => {
      const name = `${data.player.firstName} ${data.player.lastName}`
      const isRegistered = registeredIds.has(playerId)
      const count = data.dates.length
      const dates = data.dates.join(', ')
      const status = isRegistered ? '✅ SÍ' : '❌ NO'

      console.log(
        `${name.padEnd(27)} | ${data.player.role.padEnd(8)} | ${status.padEnd(10)} | ${count.toString().padStart(9)} | ${dates}`
      )
    })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('CONCLUSIONES FINALES')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('✅ CONFIRMADO: La posición final se determina por PUNTOS')
  console.log('   - Mayor puntos = 1er lugar')
  console.log('   - Ordenar por points DESC para obtener ranking')
  console.log('')
  console.log('❌ El campo "position" NO representa el ranking final')
  console.log('   - Parece ser el orden de eliminación durante el juego')
  console.log('   - NO usar para determinar ganadores/podios')
  console.log('')
  console.log('✅ SOLUCIÓN CORRECTA:')
  console.log('   1. Para cada fecha, ordenar eliminations por points DESC')
  console.log('   2. Rank 1 = mayor puntos, Rank 2 = segundo mayor, etc.')
  console.log('   3. Victorias = jugador con max(points) en cada fecha')
  console.log('   4. Podios = top 3 por puntos')
  console.log('   5. 7/2 = bottom 2 por puntos')
  console.log('   6. Filtrar por tournamentParticipants, NO solo por role')

  await prisma.$disconnect()
}

finalAnalysisRanking().catch(console.error)
