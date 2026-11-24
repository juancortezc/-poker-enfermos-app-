#!/usr/bin/env node

/**
 * Script para probar el comportamiento con fecha en estado CREATED
 */

import { prisma } from '../src/lib/prisma'

async function testCreatedStatus() {
  console.log('🧪 Probando comportamiento con fecha 11 en estado CREATED\n')
  
  try {
    // 1. Verificar estado inicial
    const initialDate = await prisma.gameDate.findFirst({
      where: { dateNumber: 11 }
    })
    
    if (!initialDate) {
      console.log('❌ No se encontró la fecha 11')
      return
    }
    
    console.log(`📊 Estado inicial: ${initialDate.status}`)
    
    // 2. Cambiar a CREATED con algunos jugadores
    console.log('\n📝 Cambiando fecha 11 a estado CREATED...')
    const updatedDate = await prisma.gameDate.update({
      where: { id: initialDate.id },
      data: { 
        status: 'CREATED',
        playerIds: ['player1', 'player2', 'player3'] // Simular jugadores configurados
      }
    })
    
    console.log(`✅ Fecha 11 actualizada a: ${updatedDate.status}`)
    
    // 3. Verificar comportamiento de endpoints
    console.log('\n🔍 Verificando endpoints después del cambio:')
    
    // Endpoint active (solo in_progress) - NO debe cambiar
    const activeDate = await prisma.gameDate.findFirst({
      where: { status: 'in_progress' }
    })
    console.log(`  /api/game-dates/active: ${activeDate ? `Fecha ${activeDate.dateNumber}` : 'null'}`)
    
    // Endpoint configured-or-active (CREATED o in_progress) - DEBE mostrar fecha 11
    const configuredOrActive = await prisma.gameDate.findFirst({
      where: {
        status: { in: ['CREATED', 'in_progress'] }
      },
      orderBy: [{ status: 'desc' }, { dateNumber: 'asc' }]
    })
    console.log(`  /api/game-dates/configured-or-active: ${configuredOrActive ? `Fecha ${configuredOrActive.dateNumber} (${configuredOrActive.status})` : 'null'}`)
    
    // 4. Simular lo que verían los componentes
    console.log('\n📱 Comportamiento esperado en componentes:')
    console.log('  🏠 Dashboard:')
    console.log(`    - hasConfiguredOrActiveDate: ${!!configuredOrActive}`)
    console.log(`    - Botón FECHA deshabilitado: ${!!configuredOrActive}`)
    
    console.log('  📅 Calendar:')
    console.log(`    - Fecha 11 mostrada como: "created" (borde azul)`)
    console.log(`    - No destacada con fondo rojo (ya configurada)`)
    
    console.log('  📝 Registro:')
    console.log(`    - hasActiveDate: ${!!activeDate}`)
    console.log(`    - Página accesible: ${!!activeDate} (NO - solo funciona con in_progress)`)
    
    console.log('  ⏱️ Timer:')
    console.log(`    - Fecha activa: ${!!activeDate}`)
    console.log(`    - Timer funcionando: ${!!activeDate} (NO - solo funciona con in_progress)`)
    
    // 5. Probar APIs via HTTP
    console.log('\n🌐 Probando APIs via HTTP:')
    
    try {
      const activeResponse = await fetch('http://localhost:3001/api/game-dates/active')
      const activeData = await activeResponse.json()
      console.log(`  GET /api/game-dates/active: ${activeData ? `Fecha ${activeData.dateNumber}` : 'null'}`)
    } catch (error) {
      console.log(`  GET /api/game-dates/active: Error - ${error.message}`)
    }
    
    try {
      const configuredResponse = await fetch('http://localhost:3001/api/game-dates/configured-or-active')
      const configuredData = await configuredResponse.json()
      console.log(`  GET /api/game-dates/configured-or-active: ${configuredData ? `Fecha ${configuredData.dateNumber} (${configuredData.status})` : 'null'}`)
    } catch (error) {
      console.log(`  GET /api/game-dates/configured-or-active: Error - ${error.message}`)
    }
    
    // 6. Esperar antes de revertir
    console.log('\n⏰ Esperando 5 segundos para que puedas verificar en el browser...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // 7. Revertir cambios
    console.log('\n↩️ Revirtiendo cambios...')
    await prisma.gameDate.update({
      where: { id: initialDate.id },
      data: { 
        status: initialDate.status,
        playerIds: initialDate.playerIds
      }
    })
    
    console.log('✅ Fecha 11 revertida al estado original')
    
    // 8. Verificar estado final
    const finalDate = await prisma.gameDate.findFirst({
      where: { dateNumber: 11 }
    })
    console.log(`📊 Estado final: ${finalDate?.status}`)
    
  } catch (error) {
    console.error('❌ Error en testing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testCreatedStatus()
}