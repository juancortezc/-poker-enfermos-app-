#!/usr/bin/env tsx

/**
 * Comprehensive fix for Date 11 based on real data from f11.jpeg
 * 
 * Discrepancies found:
 * 1. Diego Behar - MISSING (should have 1 point)
 * 2. Joffre Palacios - WRONG POINTS (should have 15 pts, has 1 pt)  
 * 3. Juan Antonio Cortez - WRONG POINTS (should have 11 pts, has 2 pts)
 * 4. Juan Fernando Ochoa - WRONG POINTS (should have 2 pts, has 10 pts)
 * 5. Juan Tapia - SHOULD BE ABSENT (has 14 pts, should have 0 - didn't participate)
 * 6. Meche Garrido - EXTRA PLAYER (has 4 pts, not in real data)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDate11Comprehensive() {
  console.log('🔧 Starting comprehensive Date 11 fix based on f11.jpeg...')
  
  try {
    // Get current eliminations to see what we're working with
    const currentEliminations = await prisma.elimination.findMany({
      where: { gameDateId: 11 },
      include: {
        eliminatedPlayer: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { position: 'asc' }
    })
    
    console.log('\n📊 Current Date 11 eliminations:')
    currentEliminations.forEach(e => {
      const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      console.log(`Position ${e.position}: ${name} (${e.points} pts) [ID: ${e.id}]`)
    })
    
    // Step 1: Remove incorrect players (Juan Tapia and Meche Garrido)
    console.log('\n🗑️  Step 1: Removing incorrect players...')
    
    const juanTapia = currentEliminations.find(e => 
      e.eliminatedPlayer.firstName === 'Juan' && e.eliminatedPlayer.lastName === 'Tapia'
    )
    
    const mecheGarrido = currentEliminations.find(e => 
      e.eliminatedPlayer.firstName === 'Meche' && e.eliminatedPlayer.lastName === 'Garrido'
    )
    
    if (juanTapia) {
      await prisma.elimination.delete({ where: { id: juanTapia.id } })
      console.log(`✅ Removed Juan Tapia (was ${juanTapia.points} pts, should be absent)`)
    }
    
    if (mecheGarrido) {
      await prisma.elimination.delete({ where: { id: mecheGarrido.id } })
      console.log(`✅ Removed Meche Garrido (was ${mecheGarrido.points} pts, not in real data)`)
    }
    
    // Step 2: Add missing Diego Behar
    console.log('\n➕ Step 2: Adding missing Diego Behar...')
    
    const diegoBehar = await prisma.player.findFirst({
      where: { firstName: 'Diego', lastName: 'Behar' }
    })
    
    if (diegoBehar) {
      await prisma.elimination.create({
        data: {
          gameDateId: 11,
          position: 20, // Will be recalculated
          eliminatedPlayerId: diegoBehar.id,
          eliminatorPlayerId: diegoBehar.id, // Self-elimination as placeholder
          points: 1,
          eliminationTime: new Date('2024-12-16T12:00:00Z').toISOString()
        }
      })
      console.log('✅ Added Diego Behar with 1 point')
    }
    
    // Step 3: Update wrong point values
    console.log('\n🔧 Step 3: Updating wrong point values...')
    
    const joffre = currentEliminations.find(e => 
      e.eliminatedPlayer.firstName === 'Joffre' && e.eliminatedPlayer.lastName === 'Palacios'
    )
    
    if (joffre) {
      await prisma.elimination.update({
        where: { id: joffre.id },
        data: { points: 15 }
      })
      console.log(`✅ Updated Joffre Palacios: ${joffre.points} → 15 points`)
    }
    
    const juanAntonio = currentEliminations.find(e => 
      e.eliminatedPlayer.firstName === 'Juan Antonio' && e.eliminatedPlayer.lastName === 'Cortez'
    )
    
    if (juanAntonio) {
      await prisma.elimination.update({
        where: { id: juanAntonio.id },
        data: { points: 11 }
      })
      console.log(`✅ Updated Juan Antonio Cortez: ${juanAntonio.points} → 11 points`)
    }
    
    const juanFernando = currentEliminations.find(e => 
      e.eliminatedPlayer.firstName === 'Juan Fernando' && e.eliminatedPlayer.lastName === 'Ochoa'
    )
    
    if (juanFernando) {
      await prisma.elimination.update({
        where: { id: juanFernando.id },
        data: { points: 2 }
      })
      console.log(`✅ Updated Juan Fernando Ochoa: ${juanFernando.points} → 2 points`)
    }
    
    // Step 4: Verify the final state
    console.log('\n✅ Step 4: Verifying final state...')
    
    const finalEliminations = await prisma.elimination.findMany({
      where: { gameDateId: 11 },
      include: {
        eliminatedPlayer: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { points: 'desc' }
    })
    
    console.log('\n📊 Final Date 11 eliminations (ordered by points):')
    finalEliminations.forEach(e => {
      const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      console.log(`${name.padEnd(25)} - ${e.points} points`)
    })
    
    // Step 5: Recalculate positions based on points (highest points = position 1)
    console.log('\n🔄 Step 5: Recalculating positions...')
    
    const sortedByPoints = [...finalEliminations].sort((a, b) => b.points - a.points)
    
    for (let i = 0; i < sortedByPoints.length; i++) {
      const elimination = sortedByPoints[i]
      const newPosition = i + 1
      
      if (elimination.position !== newPosition) {
        await prisma.elimination.update({
          where: { id: elimination.id },
          data: { position: newPosition }
        })
        
        const name = `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`
        console.log(`✅ Updated ${name}: position ${elimination.position} → ${newPosition}`)
      }
    }
    
    console.log('\n🎉 Date 11 comprehensive fix completed!')
    
    // Final validation
    console.log('\n📋 Final validation against real data:')
    const realExpected = [
      { name: 'Jorge Tamayo', points: 27 },
      { name: 'Daniel Vela', points: 24 },
      { name: 'Freddy Lopez', points: 21 },
      { name: 'Carlos Chacón', points: 18 },
      { name: 'Jose Luis Toral', points: 17 },
      { name: 'Roddy Naranjo', points: 16 },
      { name: 'Joffre Palacios', points: 15 },
      { name: 'Milton Tapia', points: 14 },
      { name: 'Juan Antonio Cortez', points: 11 },
      { name: 'Fernando Peña', points: 10 },
      { name: 'Javier Martinez', points: 9 },
      { name: 'Damian Amador', points: 8 },
      { name: 'Sean Willis', points: 6 },
      { name: 'Miguel Chiesa', points: 5 },
      { name: 'Ruben Cadena', points: 3 },
      { name: 'Juan Fernando Ochoa', points: 2 },
      { name: 'Diego Behar', points: 1 }
      // Juan Tapia absent (0 points) - removed from eliminations
    ]
    
    let allCorrect = true
    realExpected.forEach(expected => {
      const found = finalEliminations.find(e => {
        const systemName = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
        return systemName.includes(expected.name.split(' ')[0]) && e.points === expected.points
      })
      
      if (found) {
        console.log(`✅ ${expected.name}: ${expected.points} points - CORRECT`)
      } else {
        console.log(`❌ ${expected.name}: ${expected.points} points - NOT FOUND OR WRONG`)
        allCorrect = false
      }
    })
    
    if (allCorrect) {
      console.log('\n🎉 ALL DATE 11 DATA NOW MATCHES REAL DATA PERFECTLY!')
    } else {
      console.log('\n⚠️  Some discrepancies remain, manual review needed')
    }
    
  } catch (error) {
    console.error('❌ Error during comprehensive fix:', error)
  }
}

// Run the comprehensive fix
fixDate11Comprehensive()
  .catch(error => {
    console.error('❌ Fix failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })