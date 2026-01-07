#!/usr/bin/env node

/**
 * Script DEMO para mostrar los cambios funcionando
 * Cambia fecha 11 a CREATED por 30 segundos para que veas los cambios
 */

import { prisma } from '../src/lib/prisma'

async function demoCreatedStatus() {
  console.log('🎬 DEMO: Simulando fecha 11 en estado CREATED por 30 segundos\n')
  
  let originalDate = null
  
  try {
    // 1. Guardar estado original
    originalDate = await prisma.gameDate.findFirst({
      where: { dateNumber: 11 }
    })
    
    if (!originalDate) {
      console.log('❌ No se encontró la fecha 11')
      return
    }
    
    console.log(`📊 Estado original: ${originalDate.status}`)
    
    // 2. Cambiar a CREATED
    console.log('\n📝 Cambiando fecha 11 a CREATED...')
    await prisma.gameDate.update({
      where: { id: originalDate.id },
      data: { 
        status: 'CREATED',
        playerIds: ['diego', 'juan', 'pedro', 'miguel', 'carlos', 'luis', 'antonio', 'francisco', 'jose'] // 9 jugadores
      }
    })
    
    console.log('✅ Fecha 11 cambiada a CREATED')
    
    // 3. Mostrar lo que verás en cada componente
    console.log('\n🎯 AHORA VERÁS ESTOS CAMBIOS:')
    console.log('\n  🏠 DASHBOARD (http://localhost:3001):')
    console.log('    ✅ Botón "FECHA" aparecerá DESHABILITADO (gris)')
    console.log('    ✅ Esto es porque hay una fecha configurada (CREATED)')
    
    console.log('\n  📅 CALENDARIO (http://localhost:3001/admin/calendar):')
    console.log('    ✅ Fecha 11 tendrá BORDE AZUL (estado "created")')
    console.log('    ✅ NO tendrá fondo rojo (ya no está disponible)')
    
    console.log('\n  📝 REGISTRO (http://localhost:3001/registro):')
    console.log('    ❌ Seguirá diciendo "No hay fecha activa"')
    console.log('    ❌ Esto es CORRECTO (solo funciona con in_progress)')
    
    console.log('\n  ⏱️ TIMER (http://localhost:3001/timer):')
    console.log('    ❌ Seguirá diciendo "No hay fecha activa"')
    console.log('    ❌ Esto es CORRECTO (solo funciona con in_progress)')
    
    console.log('\n  🔗 APIs:')
    console.log('    ✅ /api/game-dates/active: null')
    console.log('    ✅ /api/game-dates/configured-or-active: Fecha 11')
    
    console.log('\n⏰ TIENES 30 SEGUNDOS PARA VERIFICAR LOS CAMBIOS...')
    console.log('   Ve al Dashboard y Calendar para ver los cambios')
    
    // Countdown
    for (let i = 30; i > 0; i--) {
      process.stdout.write(`\r   Revirtiendo en ${i} segundos...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('\n\n↩️ Revirtiendo cambios...')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    // 4. Revertir SIEMPRE
    if (originalDate) {
      try {
        await prisma.gameDate.update({
          where: { id: originalDate.id },
          data: { 
            status: originalDate.status,
            playerIds: originalDate.playerIds
          }
        })
        console.log('✅ Estado revertido correctamente')
      } catch (revertError) {
        console.error('❌ Error revirtiendo:', revertError)
      }
    }
    
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  demoCreatedStatus()
}