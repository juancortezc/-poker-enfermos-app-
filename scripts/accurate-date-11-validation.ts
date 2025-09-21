#!/usr/bin/env tsx

/**
 * Accurate validation based on the exact f11.jpeg image
 * Reading the FECHA 11 column and player names from the image
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Accurate real data from f11.jpeg image - reading exactly from FECHA 11 column
const realDate11FromImage = [
  { playerName: 'Roddy Naranjo', date11Points: 16 },
  { playerName: 'Freddy Lopez', date11Points: 21 },
  { playerName: 'Andres B', date11Points: 7 },      // Not in our system
  { playerName: 'Fernando Peña', date11Points: 10 },
  { playerName: 'Miguel Chiesa', date11Points: 5 },
  { playerName: 'Diego Behar', date11Points: 1 },
  { playerName: 'Ruben Cadena', date11Points: 3 },
  { playerName: 'Daniel Vela', date11Points: 24 },
  { playerName: 'Joffre Palacios', date11Points: 15 },
  { playerName: 'Jorge Tamayo', date11Points: 27 },
  { playerName: 'Juan Cortez', date11Points: 11 },    // Juan Antonio Cortez
  { playerName: 'Juan Fernando Ochoa', date11Points: 2 },
  { playerName: 'Juan Tapia', date11Points: 0 },      // 0 points = absent or didn't participate
  { playerName: 'Carlos Chacón', date11Points: 18 },
  { playerName: 'Javier Martinez', date11Points: 9 },
  { playerName: 'Damian Amador', date11Points: 8 },
  { playerName: 'Milton Tapia', date11Points: 14 },
  { playerName: 'Sean Willis', date11Points: 6 },
  { playerName: 'Jose Luis Toral', date11Points: 17 }
]

async function validateAccurateDate11() {
  console.log('🔍 Accurate Date 11 validation based on f11.jpeg image...')
  
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
  
  console.log('\n📊 Current system eliminations:')
  systemEliminations.forEach(e => {
    const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
    console.log(`Position ${e.position}: ${name} (${e.points} pts)`)
  })
  
  console.log('\n📋 Real data from f11.jpeg (FECHA 11 column):')
  realDate11FromImage.forEach((real, index) => {
    console.log(`${(index + 1).toString().padStart(2)}: ${real.playerName.padEnd(20)} - ${real.date11Points} points`)
  })
  
  console.log('\n🔍 Finding discrepancies:')
  
  const discrepancies = []
  
  realDate11FromImage.forEach(realPlayer => {
    // Find corresponding player in system
    const systemElim = systemEliminations.find(e => {
      const systemName = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      
      // Handle name variations
      if (realPlayer.playerName === 'Juan Cortez') {
        return systemName.includes('Juan Antonio Cortez')
      }
      if (realPlayer.playerName === 'Andres B') {
        return false // Not in our system
      }
      
      // Check if system name contains the real player name parts
      const realNameParts = realPlayer.playerName.toLowerCase().split(' ')
      const systemNameLower = systemName.toLowerCase()
      
      return realNameParts.some(part => systemNameLower.includes(part))
    })
    
    if (!systemElim) {
      if (realPlayer.playerName !== 'Andres B' && realPlayer.date11Points > 0) {
        console.log(`❌ MISSING: ${realPlayer.playerName} should have ${realPlayer.date11Points} points`)
        discrepancies.push({
          type: 'missing',
          player: realPlayer.playerName,
          expectedPoints: realPlayer.date11Points
        })
      } else if (realPlayer.date11Points === 0) {
        console.log(`ℹ️  ABSENT: ${realPlayer.playerName} has 0 points (didn't participate in Date 11)`)
      }
    } else {
      const systemName = `${systemElim.eliminatedPlayer.firstName} ${systemElim.eliminatedPlayer.lastName}`
      if (systemElim.points !== realPlayer.date11Points) {
        console.log(`❌ WRONG POINTS: ${realPlayer.playerName} should have ${realPlayer.date11Points} pts, system has ${systemElim.points} pts`)
        discrepancies.push({
          type: 'wrong_points',
          player: realPlayer.playerName,
          systemName: systemName,
          expectedPoints: realPlayer.date11Points,
          actualPoints: systemElim.points
        })
      } else {
        console.log(`✅ CORRECT: ${realPlayer.playerName} has ${realPlayer.date11Points} points`)
      }
    }
  })
  
  // Check for extra players in system
  console.log('\n🔍 Checking for extra players in system:')
  systemEliminations.forEach(systemElim => {
    const systemName = `${systemElim.eliminatedPlayer.firstName} ${systemElim.eliminatedPlayer.lastName}`
    
    const foundInReal = realDate11FromImage.find(real => {
      if (real.playerName === 'Juan Cortez') {
        return systemName.includes('Juan Antonio Cortez')
      }
      const realNameParts = real.playerName.toLowerCase().split(' ')
      const systemNameLower = systemName.toLowerCase()
      return realNameParts.some(part => systemNameLower.includes(part))
    })
    
    if (!foundInReal) {
      console.log(`❌ EXTRA: ${systemName} (${systemElim.points} pts) - not in real data`)
      discrepancies.push({
        type: 'extra',
        systemName: systemName,
        actualPoints: systemElim.points
      })
    }
  })
  
  console.log(`\n📊 Total discrepancies found: ${discrepancies.length}`)
  
  return discrepancies
}

// Run the accurate validation
validateAccurateDate11()
  .catch(error => {
    console.error('❌ Validation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })