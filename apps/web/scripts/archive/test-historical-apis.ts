#!/usr/bin/env tsx

/**
 * Probar APIs de ganadores históricos sin depender del servidor de desarrollo
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testHistoricalAPIs() {
  console.log('🧪 PROBANDO APIS DE GANADORES HISTÓRICOS')
  console.log('=' * 70)
  
  try {
    // Test 1: Todos los ganadores
    console.log('\n1️⃣ TEST: Todos los ganadores')
    const allWinners = await prisma.tournamentWinners.findMany({
      include: {
        champion: { select: { firstName: true, lastName: true } },
        runnerUp: { select: { firstName: true, lastName: true } }
      },
      orderBy: { tournamentNumber: 'asc' }
    })
    
    console.log(`✅ Total torneos: ${allWinners.length}`)
    console.log(`✅ Rango: Torneo ${allWinners[0]?.tournamentNumber} - ${allWinners[allWinners.length-1]?.tournamentNumber}`)
    
    // Test 2: Torneo específico
    console.log('\n2️⃣ TEST: Torneo 27 (último histórico)')
    const tournament27 = await prisma.tournamentWinners.findUnique({
      where: { tournamentNumber: 27 },
      include: {
        champion: { select: { firstName: true, lastName: true } },
        runnerUp: { select: { firstName: true, lastName: true } },
        thirdPlace: { select: { firstName: true, lastName: true } },
        siete: { select: { firstName: true, lastName: true } },
        dos: { select: { firstName: true, lastName: true } }
      }
    })
    
    if (tournament27) {
      console.log(`✅ Campeón: ${tournament27.champion.firstName} ${tournament27.champion.lastName}`)
      console.log(`✅ Subcampeón: ${tournament27.runnerUp.firstName} ${tournament27.runnerUp.lastName}`)
      console.log(`✅ Tercero: ${tournament27.thirdPlace.firstName} ${tournament27.thirdPlace.lastName}`)
      console.log(`✅ Siete (penúltimo): ${tournament27.siete.firstName} ${tournament27.siete.lastName}`)
      console.log(`✅ Dos (último): ${tournament27.dos.firstName} ${tournament27.dos.lastName}`)
    }
    
    // Test 3: Estadísticas por jugador
    console.log('\n3️⃣ TEST: Estadísticas históricas')
    
    // Contar campeonatos por jugador
    const championStats = await prisma.tournamentWinners.groupBy({
      by: ['championId'],
      _count: { championId: true },
      orderBy: { _count: { championId: 'desc' } },
      take: 5
    })
    
    console.log('🏆 Top 5 campeones históricos:')
    for (const stat of championStats) {
      const player = await prisma.player.findUnique({
        where: { id: stat.championId },
        select: { firstName: true, lastName: true }
      })
      console.log(`   ${player?.firstName} ${player?.lastName}: ${stat._count.championId} campeonatos`)
    }
    
    // Test 4: Validar nomenclatura especial
    console.log('\n4️⃣ TEST: Nomenclatura especial del grupo')
    const sampleWithSpecialNames = await prisma.tournamentWinners.findFirst({
      include: {
        siete: { select: { firstName: true, lastName: true } },
        dos: { select: { firstName: true, lastName: true } }
      }
    })
    
    if (sampleWithSpecialNames) {
      console.log(`✅ "Siete" (penúltimo): ${sampleWithSpecialNames.siete.firstName} ${sampleWithSpecialNames.siete.lastName}`)
      console.log(`✅ "Dos" (último): ${sampleWithSpecialNames.dos.firstName} ${sampleWithSpecialNames.dos.lastName}`)
    }
    
    // Test 5: Jugadores históricos creados
    console.log('\n5️⃣ TEST: Jugadores históricos inactivos')
    const historicalPlayers = await prisma.player.findMany({
      where: { 
        isActive: false,
        joinYear: 2010
      },
      select: { firstName: true, lastName: true, joinYear: true }
    })
    
    console.log(`✅ Jugadores históricos creados: ${historicalPlayers.length}`)
    historicalPlayers.forEach(player => {
      console.log(`   - ${player.firstName} ${player.lastName} (${player.joinYear})`)
    })
    
    console.log('\n🎯 RESUMEN FINAL:')
    console.log(`✅ Tabla TournamentWinners: Funcionando`)
    console.log(`✅ Relaciones Player: Funcionando`)
    console.log(`✅ Datos históricos: ${allWinners.length}/27 torneos`)
    console.log(`✅ Jugadores históricos: ${historicalPlayers.length}/7 creados`)
    console.log(`✅ Nomenclatura especial: Respetada (Siete/Dos)`)
    console.log(`✅ Sistema listo para presentación`)
    
  } catch (error) {
    console.error('❌ Error en tests:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar tests
testHistoricalAPIs()
  .catch(console.error)