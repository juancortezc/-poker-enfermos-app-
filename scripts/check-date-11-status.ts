#!/usr/bin/env node

/**
 * Script para verificar el estado actual de la fecha 11
 */

import { prisma } from '../src/lib/prisma'

async function checkDate11Status() {
  console.log('🔍 Verificando estado actual de la fecha 11\n')
  
  try {
    // Buscar fecha 11
    const date11 = await prisma.gameDate.findFirst({
      where: { dateNumber: 11 },
      include: {
        tournament: {
          select: { number: true, name: true }
        }
      }
    })
    
    if (!date11) {
      console.log('❌ No se encontró la fecha 11')
      return
    }
    
    console.log('📊 Estado actual de fecha 11:')
    console.log(`  ID: ${date11.id}`)
    console.log(`  Número: ${date11.dateNumber}`)
    console.log(`  Torneo: ${date11.tournament.number} (${date11.tournament.name})`)
    console.log(`  Status: ${date11.status}`)
    console.log(`  Fecha programada: ${date11.scheduledDate}`)
    console.log(`  Jugadores: ${date11.playerIds.length}`)
    console.log(`  Inicio: ${date11.startTime || 'No iniciada'}`)
    
    // Verificar otros endpoints relevantes
    console.log('\n🔍 Verificando endpoints:')
    
    // Endpoint active (solo in_progress)
    const activeDate = await prisma.gameDate.findFirst({
      where: { status: 'in_progress' }
    })
    console.log(`  /api/game-dates/active: ${activeDate ? `Fecha ${activeDate.dateNumber}` : 'null'}`)
    
    // Endpoint configured-or-active (CREATED o in_progress)
    const configuredOrActive = await prisma.gameDate.findFirst({
      where: {
        status: { in: ['CREATED', 'in_progress'] }
      },
      orderBy: [{ status: 'desc' }, { dateNumber: 'asc' }]
    })
    console.log(`  /api/game-dates/configured-or-active: ${configuredOrActive ? `Fecha ${configuredOrActive.dateNumber} (${configuredOrActive.status})` : 'null'}`)
    
    return date11
    
  } catch (error) {
    console.error('❌ Error verificando fecha 11:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  checkDate11Status()
}

export { checkDate11Status }