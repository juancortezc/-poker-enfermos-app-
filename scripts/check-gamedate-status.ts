import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGameDateStatus() {
  console.log('🔍 Verificando estado de GameDates para Torneo 1...\n')

  try {
    // 1. Obtener todas las GameDates del Torneo 1
    const gameDates = await prisma.gameDate.findMany({
      where: { tournamentId: 1 },
      orderBy: { dateNumber: 'asc' },
      include: {
        eliminations: {
          select: { id: true }
        }
      }
    })

    console.log(`📅 Total de GameDates encontradas: ${gameDates.length}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 2. Mostrar detalles de cada fecha
    gameDates.forEach(gd => {
      console.log(`Fecha ${gd.dateNumber}:`)
      console.log(`  ID: ${gd.id}`)
      console.log(`  Estado: ${gd.status}`)
      console.log(`  Fecha programada: ${gd.scheduledDate?.toISOString() || 'No definida'}`)
      console.log(`  Fecha inicio: ${gd.startTime || 'No iniciada'}`)
      console.log(`  Participantes: ${gd.playerIds.length}`)
      console.log(`  Eliminaciones: ${gd.eliminations.length}`)
      console.log('---')
    })

    // 3. Contar por estado
    const statusCount = gameDates.reduce((acc, gd) => {
      acc[gd.status] = (acc[gd.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n📊 Resumen por estado:')
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    // 4. Verificar cuáles están completadas
    const completedDates = gameDates.filter(gd => gd.status === 'completed')
    console.log(`\n✅ Fechas completadas: ${completedDates.length}`)
    console.log('Números de fecha completados:', completedDates.map(gd => gd.dateNumber).join(', '))

    // 5. Verificar cuáles NO están completadas
    const notCompletedDates = gameDates.filter(gd => gd.status !== 'completed')
    if (notCompletedDates.length > 0) {
      console.log(`\n❌ Fechas NO completadas: ${notCompletedDates.length}`)
      notCompletedDates.forEach(gd => {
        console.log(`  Fecha ${gd.dateNumber}: estado = ${gd.status}`)
      })
    }

    // 6. Verificar si hay fechas con eliminaciones pero no marcadas como completed
    const suspiciousDates = gameDates.filter(gd => 
      gd.eliminations.length > 0 && gd.status !== 'completed'
    )
    if (suspiciousDates.length > 0) {
      console.log(`\n⚠️  ALERTA: ${suspiciousDates.length} fechas tienen eliminaciones pero no están marcadas como completed:`)
      suspiciousDates.forEach(gd => {
        console.log(`  Fecha ${gd.dateNumber}: ${gd.eliminations.length} eliminaciones, estado = ${gd.status}`)
      })
    }

    // 7. Verificar el torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        number: true,
        status: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log('\n🏆 Información del Torneo:')
    console.log(`  ID: ${tournament?.id}`)
    console.log(`  Número: ${tournament?.number}`)
    console.log(`  Estado: ${tournament?.status}`)
    console.log(`  Nombre: ${tournament?.name}`)
    console.log(`  Creado: ${tournament?.createdAt}`)
    console.log(`  Actualizado: ${tournament?.updatedAt}`)

    // 8. Ahora verificar qué devuelve el API ranking
    console.log('\n🔍 Verificando API de ranking...')
    try {
      const fetch = (await import('node-fetch')).default
      const response = await fetch('http://localhost:3000/api/tournaments/1/ranking')
      
      if (response.ok) {
        const data = await response.json()
        console.log(`  Total de fechas en API: ${data.tournament?.gameDates?.length || 'undefined'}`)
        console.log(`  Fechas completadas en API: ${data.tournament?.gameDates?.filter((gd: any) => gd.status === 'completed').length || 'undefined'}`)
        
        if (data.tournament?.gameDates) {
          const apiCompletedDates = data.tournament.gameDates
            .filter((gd: any) => gd.status === 'completed')
            .map((gd: any) => gd.dateNumber)
            .sort((a: number, b: number) => a - b)
          console.log(`  Números de fechas completadas en API: ${apiCompletedDates.join(', ')}`)
        }
      } else {
        console.log(`  ❌ Error en API: ${response.status} ${response.statusText}`)
      }
    } catch (apiError) {
      console.log(`  ❌ Error al conectar con API: ${apiError}`)
    }

  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkGameDateStatus()