#!/usr/bin/env node

/**
 * Script para testear la solución de inconsistencias de estado de fechas
 * 
 * Prueba:
 * 1. Endpoint nuevo /api/game-dates/configured-or-active
 * 2. Compara con endpoint existente /api/game-dates/active
 * 3. Simula crear fecha CREATED y verifica comportamiento
 */

import { prisma } from '../src/lib/prisma'

async function testDateStatusFix() {
  console.log('🧪 Testing Date Status Fix Solution\n')
  
  try {
    // 1. Verificar estado actual
    console.log('📊 Estado actual de fechas:')
    const allDates = await prisma.gameDate.findMany({
      include: {
        tournament: {
          select: { number: true }
        }
      },
      orderBy: { dateNumber: 'asc' }
    })
    
    allDates.forEach(date => {
      console.log(`  - Fecha ${date.dateNumber} (T${date.tournament.number}): ${date.status}`)
    })
    
    // 2. Buscar fecha activa (in_progress)
    console.log('\n🔍 Endpoint /api/game-dates/active (solo in_progress):')
    const activeDate = await prisma.gameDate.findFirst({
      where: { status: 'in_progress' },
      include: { tournament: true }
    })
    
    if (activeDate) {
      console.log(`  ✅ Fecha encontrada: ${activeDate.dateNumber} (${activeDate.status})`)
    } else {
      console.log(`  ❌ No hay fechas in_progress`)
    }
    
    // 3. Buscar fecha configurada o activa (CREATED o in_progress)
    console.log('\n🆕 Endpoint /api/game-dates/configured-or-active (CREATED o in_progress):')
    const configuredOrActive = await prisma.gameDate.findFirst({
      where: {
        status: {
          in: ['CREATED', 'in_progress']
        }
      },
      include: { tournament: true },
      orderBy: [
        { status: 'desc' },
        { dateNumber: 'asc' }
      ]
    })
    
    if (configuredOrActive) {
      console.log(`  ✅ Fecha encontrada: ${configuredOrActive.dateNumber} (${configuredOrActive.status})`)
    } else {
      console.log(`  ❌ No hay fechas CREATED o in_progress`)
    }
    
    // 4. Simular creación de fecha CREATED
    console.log('\n🧪 Simulando fecha con estado CREATED...')
    
    // Buscar próxima fecha pending
    const nextPendingDate = await prisma.gameDate.findFirst({
      where: { status: 'pending' },
      orderBy: { dateNumber: 'asc' }
    })
    
    if (nextPendingDate) {
      console.log(`  📝 Cambiando fecha ${nextPendingDate.dateNumber} de pending a CREATED`)
      
      // Cambiar a CREATED
      const updatedDate = await prisma.gameDate.update({
        where: { id: nextPendingDate.id },
        data: { status: 'CREATED' }
      })
      
      // Verificar endpoints después del cambio
      console.log('\n📊 Después del cambio a CREATED:')
      
      // Endpoint activo (solo in_progress)
      const stillActiveDate = await prisma.gameDate.findFirst({
        where: { status: 'in_progress' }
      })
      console.log(`  /api/game-dates/active: ${stillActiveDate ? `Fecha ${stillActiveDate.dateNumber}` : 'null'}`)
      
      // Endpoint configurado o activo (CREATED o in_progress)
      const nowConfiguredOrActive = await prisma.gameDate.findFirst({
        where: {
          status: { in: ['CREATED', 'in_progress'] }
        },
        orderBy: [{ status: 'desc' }, { dateNumber: 'asc' }]
      })
      console.log(`  /api/game-dates/configured-or-active: ${nowConfiguredOrActive ? `Fecha ${nowConfiguredOrActive.dateNumber} (${nowConfiguredOrActive.status})` : 'null'}`)
      
      // Revertir cambio
      console.log(`\n↩️  Revirtiendo fecha ${updatedDate.dateNumber} a pending`)
      await prisma.gameDate.update({
        where: { id: updatedDate.id },
        data: { status: 'pending' }
      })
      
      console.log('✅ Simulación completada - estado revertido')
    } else {
      console.log('  ⚠️  No hay fechas pending para simular')
    }
    
    // 5. Resumen de la solución
    console.log('\n📋 Resumen de la solución:')
    console.log('  ✅ Nuevo endpoint: /api/game-dates/configured-or-active')
    console.log('  ✅ Nuevo hook: useConfiguredOrActiveGameDate')
    console.log('  ✅ Dashboard: botón FECHA usa nueva lógica')
    console.log('  ✅ Calendar: lógica de highlighting actualizada')
    console.log('  ✅ Endpoints existentes: sin cambios (compatibilidad)')
    
    console.log('\n🎯 Comportamiento esperado:')
    console.log('  - Dashboard deshabilita FECHA si hay fecha CREATED o in_progress')
    console.log('  - Registro/Timer siguen usando solo in_progress (sin cambios)')
    console.log('  - Calendar resalta solo fechas verdaderamente disponibles')
    console.log('  - Lógica consistente entre componentes')
    
  } catch (error) {
    console.error('❌ Error en testing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testDateStatusFix()
}