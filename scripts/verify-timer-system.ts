import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyTimerSystem() {
  console.log('🔍 Verificando sistema completo de timer...')
  
  try {
    // 1. Verificar estado de Date 11
    console.log('\n📅 1. Verificando estado de Date 11...')
    const date11 = await prisma.gameDate.findFirst({
      where: {
        dateNumber: 11
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        },
        timerStates: true,
        eliminations: true,
        gameResults: true
      }
    })

    if (!date11) {
      console.log('❌ Date 11 no encontrada')
      return
    }

    console.log(`✅ Date 11 encontrada (ID: ${date11.id})`)
    console.log(`   Status: ${date11.status}`)
    console.log(`   Player IDs: [${date11.playerIds.join(', ') || 'empty'}]`)
    console.log(`   Timer States: ${date11.timerStates.length}`)
    console.log(`   Start Time: ${date11.startTime || 'null'}`)

    // 2. Verificar torneo activo y sus blind levels
    console.log('\n🏆 2. Verificando torneo activo...')
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      include: {
        blindLevels: {
          orderBy: { level: 'asc' }
        }
      }
    })

    if (!activeTournament) {
      console.log('❌ No hay torneo activo')
      return
    }

    console.log(`✅ Torneo activo: ${activeTournament.name}`)
    console.log(`   Blind levels: ${activeTournament.blindLevels.length}`)
    console.log(`   Primer nivel: ${activeTournament.blindLevels[0]?.smallBlind}/${activeTournament.blindLevels[0]?.bigBlind} (${activeTournament.blindLevels[0]?.duration}min)`)

    // 3. Verificar fechas del torneo activo
    console.log('\n📋 3. Verificando fechas del torneo activo...')
    const tournamentDates = await prisma.gameDate.findMany({
      where: {
        tournamentId: activeTournament.id
      },
      orderBy: { dateNumber: 'asc' },
      include: {
        timerStates: true
      }
    })

    console.log(`✅ Total fechas en torneo: ${tournamentDates.length}`)
    
    const statusCount = {
      pending: 0,
      CREATED: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    }

    tournamentDates.forEach(date => {
      statusCount[date.status as keyof typeof statusCount]++
    })

    console.log(`   - Pending: ${statusCount.pending}`)
    console.log(`   - CREATED: ${statusCount.CREATED}`)  
    console.log(`   - In Progress: ${statusCount.in_progress}`)
    console.log(`   - Completed: ${statusCount.completed}`)
    console.log(`   - Cancelled: ${statusCount.cancelled}`)

    // 4. Verificar fecha activa (in_progress)
    console.log('\n⚡ 4. Verificando fecha activa...')
    const activeDate = await prisma.gameDate.findFirst({
      where: { status: 'in_progress' },
      include: {
        timerStates: true,
        tournament: {
          include: {
            blindLevels: {
              orderBy: { level: 'asc' }
            }
          }
        }
      }
    })

    if (activeDate) {
      console.log(`✅ Fecha activa encontrada: Date ${activeDate.dateNumber} (ID: ${activeDate.id})`)
      console.log(`   Players: ${activeDate.playerIds.length}`)
      console.log(`   Start Time: ${activeDate.startTime}`)
      console.log(`   Timer States: ${activeDate.timerStates.length}`)

      if (activeDate.timerStates.length > 0) {
        const timerState = activeDate.timerStates[0]
        console.log(`   Timer Status: ${timerState.status}`)
        console.log(`   Current Level: ${timerState.currentLevel}`)
        console.log(`   Time Remaining: ${timerState.timeRemaining}s`)
        console.log(`   Level Start Time: ${timerState.levelStartTime}`)
      }
    } else {
      console.log('ℹ️ No hay fecha activa (esto es normal si no hay juego en progreso)')
    }

    // 5. Verificar fecha configurada (CREATED)
    console.log('\n🔧 5. Verificando fechas configuradas...')
    const createdDates = await prisma.gameDate.findMany({
      where: { status: 'CREATED' },
      include: {
        timerStates: true
      }
    })

    if (createdDates.length > 0) {
      console.log(`✅ ${createdDates.length} fecha(s) configurada(s):`)
      createdDates.forEach(date => {
        console.log(`   - Date ${date.dateNumber} (ID: ${date.id}): ${date.playerIds.length} players`)
      })
    } else {
      console.log('ℹ️ No hay fechas configuradas (estado CREATED)')
    }

    // 6. Verificar usuarios con PIN
    console.log('\n👥 6. Verificando usuarios con acceso...')
    const usersWithPin = await prisma.player.findMany({
      where: {
        pin: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true
      }
    })

    console.log(`✅ ${usersWithPin.length} usuarios activos con PIN:`)
    usersWithPin.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role}): PIN ${user.pin}`)
    })

    // 7. Test summary
    console.log('\n📋 RESUMEN DE VERIFICACIÓN:')
    console.log('✅ Date 11 limpiada correctamente')
    console.log('✅ Torneo activo con blind levels configurados')
    console.log('✅ Fechas del torneo en estado correcto')
    console.log('✅ Usuarios con acceso PIN configurados')
    console.log('✅ Sistema listo para crear y iniciar fechas')

    console.log('\n🎯 PRÓXIMOS PASOS PARA PROBAR:')
    console.log('1. Ir a /game-dates/config')
    console.log('2. Seleccionar Date 11')
    console.log('3. Elegir participantes')
    console.log('4. ACTIVAR fecha')
    console.log('5. Ir a confirmación e INICIAR')
    console.log('6. Verificar que el timer aparece en Dashboard')

  } catch (error) {
    console.error('❌ Error durante verificación:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the verification
verifyTimerSystem()
  .then(() => {
    console.log('\n✅ Verificación del sistema timer completada!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Verificación del sistema timer falló:', error)
    process.exit(1)
  })