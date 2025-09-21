#!/usr/bin/env tsx

/**
 * Comprehensive validation of Date 11 against real data from f11.jpeg
 * Real data from image shows final positions and points
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real data from f11.jpeg image - Date 11 column showing points earned
const realDate11Data = [
  { position: 1, player: 'Jorge Tamayo', points: 27 },
  { position: 2, player: 'Daniel Vela', points: 24 },
  { position: 3, player: 'Freddy Lopez', points: 21 },
  { position: 4, player: 'Carlos Chacón', points: 18 },
  { position: 5, player: 'Jose Luis Toral', points: 17 },
  { position: 6, player: 'Roddy Naranjo', points: 16 },
  { position: 7, player: 'Juan Tapia', points: 15 },
  { position: 8, player: 'Milton Tapia', points: 14 },
  { position: 9, player: 'Jose Patricio Moreno', points: 13 },
  { position: 10, player: 'Juan Guajardo', points: 12 },
  { position: 11, player: 'Fernando Peña', points: 11 },
  { position: 12, player: 'Javier Martinez', points: 10 },
  { position: 13, player: 'Damian Amador', points: 9 },
  { position: 14, player: 'Mono Benites', points: 8 },
  { position: 15, player: 'Sean Willis', points: 7 },
  { position: 16, player: 'Miguel Chiesa', points: 6 },
  { position: 17, player: 'Meche Garrido', points: 5 },
  { position: 18, player: 'Ruben Cadena', points: 4 },
  { position: 19, player: 'Juan Antonio Cortez', points: 2 },
  { position: 20, player: 'Diego Behar', points: 1 }
]

async function validateDate11Comprehensive() {
  console.log('🔍 Comprehensive Date 11 validation against f11.jpeg...')
  
  // Get current system data
  const systemEliminations = await prisma.elimination.findMany({
    where: { gameDateId: 11 },
    include: {
      eliminatedPlayer: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { position: 'asc' }
  })
  
  console.log('\n📊 System vs Real Data Comparison:')
  console.log('POS | REAL PLAYER        | REAL PTS | SYSTEM PLAYER      | SYS PTS | STATUS')
  console.log('----|--------------------|---------|--------------------|---------|--------')
  
  const discrepancies = []
  
  realDate11Data.forEach(realData => {
    const systemData = systemEliminations.find(e => e.position === realData.position)
    
    if (!systemData) {
      console.log(`${realData.position.toString().padEnd(3)} | ${realData.player.padEnd(18)} | ${realData.points.toString().padEnd(7)} | NOT FOUND          | N/A     | ❌ MISSING`)
      discrepancies.push({
        type: 'missing',
        position: realData.position,
        expectedPlayer: realData.player,
        expectedPoints: realData.points
      })
      return
    }
    
    const systemPlayerName = `${systemData.eliminatedPlayer.firstName} ${systemData.eliminatedPlayer.lastName}`
    const playerMatch = systemPlayerName.toLowerCase().includes(realData.player.toLowerCase().split(' ')[0])
    const pointsMatch = systemData.points === realData.points
    
    let status = '✅ OK'
    if (!playerMatch || !pointsMatch) {
      status = '❌ ERROR'
      discrepancies.push({
        type: 'mismatch',
        position: realData.position,
        expectedPlayer: realData.player,
        expectedPoints: realData.points,
        actualPlayer: systemPlayerName,
        actualPoints: systemData.points
      })
    }
    
    console.log(`${realData.position.toString().padEnd(3)} | ${realData.player.padEnd(18)} | ${realData.points.toString().padEnd(7)} | ${systemPlayerName.padEnd(18)} | ${systemData.points.toString().padEnd(7)} | ${status}`)
  })
  
  // Check for extra eliminations in system that shouldn't be there
  console.log('\n🔍 Checking for extra eliminations in system:')
  systemEliminations.forEach(systemElim => {
    const realMatch = realDate11Data.find(real => real.position === systemElim.position)
    if (!realMatch) {
      const systemPlayerName = `${systemElim.eliminatedPlayer.firstName} ${systemElim.eliminatedPlayer.lastName}`
      console.log(`❌ EXTRA: Position ${systemElim.position} - ${systemPlayerName} (${systemElim.points} pts) - NOT in real data`)
      discrepancies.push({
        type: 'extra',
        position: systemElim.position,
        actualPlayer: systemPlayerName,
        actualPoints: systemElim.points
      })
    }
  })
  
  console.log('\n📋 Summary of Discrepancies:')
  if (discrepancies.length === 0) {
    console.log('✅ No discrepancies found - system matches real data perfectly!')
  } else {
    console.log(`❌ Found ${discrepancies.length} discrepancies:`)
    
    discrepancies.forEach((disc, index) => {
      console.log(`\n${index + 1}. ${disc.type.toUpperCase()} at position ${disc.position}:`)
      if (disc.type === 'missing') {
        console.log(`   Expected: ${disc.expectedPlayer} (${disc.expectedPoints} pts)`)
        console.log(`   System: NOT FOUND`)
      } else if (disc.type === 'mismatch') {
        console.log(`   Expected: ${disc.expectedPlayer} (${disc.expectedPoints} pts)`)
        console.log(`   System: ${disc.actualPlayer} (${disc.actualPoints} pts)`)
      } else if (disc.type === 'extra') {
        console.log(`   System has: ${disc.actualPlayer} (${disc.actualPoints} pts)`)
        console.log(`   Real data: Position should not exist or different player`)
      }
    })
  }
  
  return discrepancies
}

// Run the comprehensive validation
validateDate11Comprehensive()
  .catch(error => {
    console.error('❌ Validation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })