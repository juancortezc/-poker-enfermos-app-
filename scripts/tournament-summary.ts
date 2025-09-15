import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function tournamentSummary() {
  console.log('🏆 RESUMEN COMPLETO - TORNEO 28 (ID: 1)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. Información del torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: 1 },
      include: {
        gameDates: {
          orderBy: { dateNumber: 'asc' },
          include: {
            eliminations: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!tournament) {
      console.log('❌ Torneo no encontrado')
      return
    }

    console.log(`📋 Información Básica:`)
    console.log(`   Nombre: ${tournament.name}`)
    console.log(`   Número: ${tournament.number}`)
    console.log(`   Estado: ${tournament.status}`)
    console.log(`   Total fechas programadas: ${tournament.gameDates.length}`)

    // 2. Estado de fechas por categoría
    const statusCounts = tournament.gameDates.reduce((acc, gd) => {
      acc[gd.status] = (acc[gd.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`\n📊 Estado de Fechas:`)
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === 'completed' ? '✅' : 
                   status === 'in_progress' ? '🔄' : 
                   status === 'CREATED' ? '📝' : '⏳'
      console.log(`   ${emoji} ${status}: ${count}`)
    })

    // 3. Fechas completadas con detalle
    const completedDates = tournament.gameDates.filter(gd => gd.status === 'completed')
    console.log(`\n✅ FECHAS COMPLETADAS (${completedDates.length}/12):`)
    completedDates.forEach(gd => {
      const dateStr = gd.scheduledDate?.toLocaleDateString('es-EC', { 
        weekday: 'short', 
        day: '2-digit', 
        month: '2-digit' 
      }) || 'Sin fecha'
      console.log(`   Fecha ${gd.dateNumber}: ${dateStr} - ${gd.playerIds?.length || 0} jugadores - ${gd.eliminations.length} eliminaciones`)
    })

    // 4. Fechas pendientes
    const pendingDates = tournament.gameDates.filter(gd => gd.status !== 'completed')
    if (pendingDates.length > 0) {
      console.log(`\n⏳ FECHAS PENDIENTES (${pendingDates.length}):`)
      pendingDates.forEach(gd => {
        const dateStr = gd.scheduledDate?.toLocaleDateString('es-EC', { 
          weekday: 'short', 
          day: '2-digit', 
          month: '2-digit' 
        }) || 'Sin fecha'
        console.log(`   Fecha ${gd.dateNumber}: ${dateStr} - Estado: ${gd.status}`)
      })
    }

    // 5. Verificación de integridad
    console.log(`\n🔍 VERIFICACIÓN DE INTEGRIDAD:`)
    
    const hasAllDates = tournament.gameDates.length === 12
    console.log(`   ✅ Total fechas programadas: ${hasAllDates ? 'CORRECTO (12)' : `INCORRECTO (${tournament.gameDates.length})`}`)
    
    const completedCount = completedDates.length
    console.log(`   ✅ Fechas completadas: ${completedCount} (${((completedCount / 12) * 100).toFixed(1)}% del torneo)`)
    
    const integrityIssues = completedDates.filter(gd => 
      gd.eliminations.length === 0 || (gd.playerIds?.length || 0) === 0
    )
    console.log(`   ${integrityIssues.length === 0 ? '✅' : '⚠️'} Integridad de datos: ${integrityIssues.length === 0 ? 'CORRECTA' : `${integrityIssues.length} problemas`}`)

    // 6. Estado del sistema ELIMINA 2
    const elimina2Active = completedCount >= 6 // Necesita mínimo 6 fechas para activarse
    console.log(`   ${elimina2Active ? '✅' : '⏳'} Sistema ELIMINA 2: ${elimina2Active ? 'ACTIVO' : 'INACTIVO (necesita ≥6 fechas)'}`)

    console.log(`\n🎯 CONCLUSIÓN: El torneo tiene ${completedCount} fechas completadas de 12 programadas.`)
    console.log(`   Estado del sistema: ${completedCount >= 10 ? '🟢 EXCELENTE' : completedCount >= 6 ? '🟡 BUENO' : '🔴 INICIAL'}`)

  } catch (error) {
    console.error('❌ Error al generar resumen:', error)
  } finally {
    await prisma.$disconnect()
  }
}

tournamentSummary()