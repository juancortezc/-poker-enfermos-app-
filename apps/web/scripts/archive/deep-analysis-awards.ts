import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deepAnalysisAwards() {
  console.log('🔍 ANÁLISIS PROFUNDO DE DATOS - Validación de Premios\n')

  const tournamentId = 1 // T28

  // ============================================================
  // 1. Analizar PARTICIPANTES DEL TORNEO
  // ============================================================
  console.log('═══════════════════════════════════════════════════════')
  console.log('1. PARTICIPANTES REGISTRADOS EN EL TORNEO 28')
  console.log('═══════════════════════════════════════════════════════')

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

  console.log(`\nParticipantes registrados en Tournament.tournamentParticipants:`)
  console.log(`Total: ${tournament?.tournamentParticipants.length || 0}`)

  const registeredPlayerIds = new Set(
    tournament?.tournamentParticipants.map(tp => tp.playerId) || []
  )

  tournament?.tournamentParticipants.forEach((tp, i) => {
    console.log(`  ${i + 1}. ${tp.player.firstName} ${tp.player.lastName} (${tp.player.role})`)
  })

  // ============================================================
  // 2. Analizar JUAN GUAJARDO
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('2. CASO: JUAN GUAJARDO (Gay del Torneo)')
  console.log('═══════════════════════════════════════════════════════')

  const juanGuajardo = await prisma.player.findFirst({
    where: {
      firstName: 'Juan',
      lastName: 'Guajardo'
    }
  })

  if (juanGuajardo) {
    console.log(`\n📋 Información de Juan Guajardo:`)
    console.log(`  ID: ${juanGuajardo.id}`)
    console.log(`  Nombre: ${juanGuajardo.firstName} ${juanGuajardo.lastName}`)
    console.log(`  Role: ${juanGuajardo.role}`)
    console.log(`  ¿Registrado en T28?: ${registeredPlayerIds.has(juanGuajardo.id) ? '✅ SÍ' : '❌ NO'}`)

    // Contar sus eliminaciones como eliminador
    const elimsAsEliminator = await prisma.elimination.count({
      where: {
        eliminatorPlayerId: juanGuajardo.id,
        gameDate: {
          tournamentId
        }
      }
    })

    console.log(`  Eliminaciones hechas: ${elimsAsEliminator}`)
  }

  // ============================================================
  // 3. Analizar JUAN ANTONIO CORTEZ - VICTORIAS
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('3. CASO: JUAN ANTONIO CORTEZ (Victorias)')
  console.log('═══════════════════════════════════════════════════════')

  const juanAntonio = await prisma.player.findFirst({
    where: {
      firstName: 'Juan Antonio',
      lastName: 'Cortez'
    }
  })

  if (juanAntonio) {
    console.log(`\n📋 Información de Juan Antonio Cortez:`)
    console.log(`  ID: ${juanAntonio.id}`)
    console.log(`  Role: ${juanAntonio.role}`)
    console.log(`  ¿Registrado en T28?: ${registeredPlayerIds.has(juanAntonio.id) ? '✅ SÍ' : '❌ NO'}`)

    // Buscar todas sus participaciones
    const participations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: juanAntonio.id,
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

    console.log(`\n  Participaciones (como eliminado):`)
    participations.forEach(p => {
      const isWinner = p.position === 1
      console.log(`    Fecha ${p.gameDate.dateNumber}: Posición ${p.position}, ${p.points} pts ${isWinner ? '🏆 GANADOR' : ''}`)
    })

    // Verificar si ganó fechas sin estar eliminado
    const gameDates = await prisma.gameDate.findMany({
      where: { tournamentId },
      select: {
        id: true,
        dateNumber: true,
        playerIds: true
      }
    })

    console.log(`\n  Verificación de participación en todas las fechas:`)
    for (const gd of gameDates) {
      const participated = gd.playerIds.includes(juanAntonio.id)
      const elimination = participations.find(p => p.gameDateId === gd.id)

      if (participated) {
        if (elimination) {
          console.log(`    Fecha ${gd.dateNumber}: Pos ${elimination.position} (${elimination.points} pts)`)
        } else {
          // No tiene eliminación pero está en playerIds
          console.log(`    Fecha ${gd.dateNumber}: ⚠️  En playerIds pero SIN eliminación (¿ganador o falta?)`)

          // Verificar cuántas eliminaciones hay en esa fecha
          const elimsInDate = await prisma.elimination.count({
            where: { gameDateId: gd.id }
          })

          console.log(`      Total eliminaciones en fecha ${gd.dateNumber}: ${elimsInDate}`)
          console.log(`      Total jugadores registrados: ${gd.playerIds.length}`)

          if (elimsInDate === gd.playerIds.length) {
            console.log(`      ❌ ERROR: Todos eliminados, no debería tener ganador sin eliminar`)
          } else if (elimsInDate === gd.playerIds.length - 1) {
            console.log(`      🏆 GANADOR: Es el único sin eliminación`)
          } else {
            console.log(`      ⚠️  FALTA: No jugó`)
          }
        }
      }
    }
  }

  // ============================================================
  // 4. Analizar JOSE PATRICIO MORENO - FALTAS
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('4. CASO: JOSE PATRICIO MORENO (Faltas)')
  console.log('═══════════════════════════════════════════════════════')

  const joseMoreno = await prisma.player.findFirst({
    where: {
      firstName: 'Jose Patricio',
      lastName: 'Moreno'
    }
  })

  if (joseMoreno) {
    console.log(`\n📋 Información de Jose Patricio Moreno:`)
    console.log(`  ID: ${joseMoreno.id}`)
    console.log(`  Role: ${joseMoreno.role}`)
    console.log(`  ¿Registrado en T28?: ${registeredPlayerIds.has(joseMoreno.id) ? '✅ SÍ' : '❌ NO'}`)

    const participations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: joseMoreno.id,
        gameDate: {
          tournamentId
        }
      },
      include: {
        gameDate: {
          select: {
            dateNumber: true,
            playerIds: true
          }
        }
      },
      orderBy: {
        gameDate: {
          dateNumber: 'asc'
        }
      }
    })

    console.log(`\n  Participaciones:`)
    participations.forEach(p => {
      const inPlayerIds = p.gameDate.playerIds.includes(joseMoreno.id)
      console.log(`    Fecha ${p.gameDate.dateNumber}: Pos ${p.position}, ${p.points} pts (en playerIds: ${inPlayerIds ? 'Sí' : 'No'})`)
    })

    // Verificar fechas donde está en playerIds pero sin eliminación
    const allDates = await prisma.gameDate.findMany({
      where: { tournamentId },
      select: {
        id: true,
        dateNumber: true,
        playerIds: true
      }
    })

    const faltaDates = allDates.filter(gd => {
      const isRegistered = gd.playerIds.includes(joseMoreno.id)
      const hasElimination = participations.some(p => p.gameDateId === gd.id)
      return isRegistered && !hasElimination
    })

    console.log(`\n  Faltas detectadas (en playerIds pero sin eliminación):`)
    faltaDates.forEach(fd => {
      console.log(`    Fecha ${fd.dateNumber}: ❌ FALTA (0 puntos)`)
    })
  }

  // ============================================================
  // 5. Analizar MECHE GARRIDO - FALTAS
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('5. CASO: MECHE GARRIDO (Faltas)')
  console.log('═══════════════════════════════════════════════════════')

  const meche = await prisma.player.findFirst({
    where: {
      firstName: 'Meche',
      lastName: 'Garrido'
    }
  })

  if (meche) {
    console.log(`\n📋 Información de Meche Garrido:`)
    console.log(`  ID: ${meche.id}`)
    console.log(`  Role: ${meche.role}`)
    console.log(`  ¿Registrado en T28?: ${registeredPlayerIds.has(meche.id) ? '✅ SÍ' : '❌ NO'}`)

    const participations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: meche.id,
        gameDate: {
          tournamentId
        }
      },
      include: {
        gameDate: {
          select: {
            dateNumber: true,
            playerIds: true
          }
        }
      },
      orderBy: {
        gameDate: {
          dateNumber: 'asc'
        }
      }
    })

    console.log(`\n  Participaciones:`)
    participations.forEach(p => {
      const inPlayerIds = p.gameDate.playerIds.includes(meche.id)
      console.log(`    Fecha ${p.gameDate.dateNumber}: Pos ${p.position}, ${p.points} pts (en playerIds: ${inPlayerIds ? 'Sí' : 'No'})`)
    })

    const allDates = await prisma.gameDate.findMany({
      where: { tournamentId },
      select: {
        id: true,
        dateNumber: true,
        playerIds: true
      }
    })

    const faltaDates = allDates.filter(gd => {
      const isRegistered = gd.playerIds.includes(meche.id)
      const hasElimination = participations.some(p => p.gameDateId === gd.id)
      return isRegistered && !hasElimination
    })

    console.log(`\n  Faltas detectadas:`)
    faltaDates.forEach(fd => {
      console.log(`    Fecha ${fd.dateNumber}: ❌ FALTA (0 puntos)`)
    })
  }

  // ============================================================
  // 6. TABLA COMPLETA DE VICTORIAS
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('6. TABLA COMPLETA DE VICTORIAS (Posición 1)')
  console.log('═══════════════════════════════════════════════════════')

  const allWinners = await prisma.elimination.findMany({
    where: {
      position: 1,
      gameDate: {
        tournamentId
      }
    },
    include: {
      eliminatedPlayer: {
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
    },
    orderBy: {
      gameDate: {
        dateNumber: 'asc'
      }
    }
  })

  console.log(`\nTotal victorias registradas: ${allWinners.length}`)
  console.log(`\nDetalle por fecha:`)
  allWinners.forEach(w => {
    const isRegistered = registeredPlayerIds.has(w.eliminatedPlayer.id)
    console.log(`  Fecha ${w.gameDate.dateNumber}: ${w.eliminatedPlayer.firstName} ${w.eliminatedPlayer.lastName} (${w.eliminatedPlayer.role}) ${!isRegistered ? '⚠️  NO REGISTRADO EN T28' : ''}`)
  })

  // Contar victorias por jugador
  const victoriasByPlayer = new Map<string, { player: any; dates: number[] }>()
  allWinners.forEach(w => {
    const playerId = w.eliminatedPlayer.id
    if (!victoriasByPlayer.has(playerId)) {
      victoriasByPlayer.set(playerId, {
        player: w.eliminatedPlayer,
        dates: []
      })
    }
    victoriasByPlayer.get(playerId)!.dates.push(w.gameDate.dateNumber)
  })

  console.log(`\n📊 Resumen de victorias por jugador:`)
  Array.from(victoriasByPlayer.entries())
    .sort((a, b) => b[1].dates.length - a[1].dates.length)
    .forEach(([playerId, data]) => {
      const isRegistered = registeredPlayerIds.has(playerId)
      const count = data.dates.length
      const datesStr = data.dates.join(', ')
      console.log(`  ${data.player.firstName} ${data.player.lastName} (${data.player.role}): ${count} victoria${count > 1 ? 's' : ''} - Fechas: ${datesStr} ${!isRegistered ? '⚠️  NO REGISTRADO' : ''}`)
    })

  await prisma.$disconnect()
}

deepAnalysisAwards().catch(console.error)
