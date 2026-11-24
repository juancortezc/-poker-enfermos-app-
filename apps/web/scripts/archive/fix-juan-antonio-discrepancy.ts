#!/usr/bin/env tsx

/**
 * Script to fix Juan Antonio Cortez point discrepancy
 * Issues found:
 * 1. Date 11: Has 11 points, should have 2 points (position 19)
 * 2. Date 2: Missing elimination record (auto-assigned as winner)
 * Real total: 119, System total: 100 (missing 19 points)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixJuanAntonioDiscrepancy() {
  console.log('🔧 Fixing Juan Antonio Cortez point discrepancy...')
  
  // Get Juan Antonio's player ID
  const juanAntonio = await prisma.player.findFirst({
    where: {
      firstName: 'Juan Antonio',
      lastName: 'Cortez'
    }
  })
  
  if (!juanAntonio) {
    console.error('❌ Juan Antonio not found')
    return
  }
  
  console.log('✅ Found Juan Antonio:', juanAntonio.firstName, juanAntonio.lastName, 'ID:', juanAntonio.id)
  
  try {
    // Fix 1: Update Date 11 points from 11 to 2 (position 19)
    console.log('\n🔧 Fix 1: Updating Date 11 points from 11 to 2...')
    
    const date11Elimination = await prisma.elimination.findFirst({
      where: {
        eliminatedPlayerId: juanAntonio.id,
        gameDateId: 11
      }
    })
    
    if (date11Elimination) {
      await prisma.elimination.update({
        where: { id: date11Elimination.id },
        data: { 
          points: 2,
          position: 19
        }
      })
      console.log('✅ Date 11: Updated from 11 pts to 2 pts (position 19)')
    } else {
      console.log('❌ Date 11 elimination not found')
    }
    
    // Fix 2: Create correct elimination for Juan Antonio in Date 2
    console.log('\n🔧 Fix 2: Creating Date 2 elimination (position 6, 19 pts)...')
    
    // Based on real data: Juan Antonio Cortez was eliminated in position 6 by Meche Garrido with 19 points
    const date2 = await prisma.gameDate.findUnique({
      where: { id: 2 }
    })
    
    if (!date2) {
      console.log('❌ Date 2 not found')
      return
    }
    
    // Check if Juan Antonio already has an elimination in Date 2
    const existingElimination = await prisma.elimination.findFirst({
      where: {
        eliminatedPlayerId: juanAntonio.id,
        gameDateId: 2
      }
    })
    
    if (existingElimination) {
      console.log(`Juan Antonio already has elimination in Date 2: Position ${existingElimination.position}, Points ${existingElimination.points}`)
      
      // Update to correct values
      await prisma.elimination.update({
        where: { id: existingElimination.id },
        data: {
          position: 6,
          points: 19
        }
      })
      console.log('✅ Updated existing Date 2 elimination to position 6, 19 pts')
    } else {
      // Get Meche Garrido's ID for eliminator
      const mecheGarrido = await prisma.player.findFirst({
        where: {
          firstName: 'Meche',
          lastName: 'Garrido'
        }
      })
      
      const eliminatorId = mecheGarrido?.id || juanAntonio.id // Fallback to self-elimination
      
      // Create new elimination
      const eliminationData = {
        gameDateId: 2,
        position: 6,
        eliminatedPlayerId: juanAntonio.id,
        eliminatorPlayerId: eliminatorId,
        points: 19,
        eliminationTime: new Date('2025-04-30T12:00:00Z').toISOString()
      }
      
      const newElimination = await prisma.elimination.create({
        data: eliminationData
      })
      
      console.log(`✅ Created Date 2 elimination: Position ${newElimination.position}, Points ${newElimination.points}`)
    }
    
    // Verify the fix
    console.log('\n📊 Verification - Juan Antonio\'s eliminations after fix:')
    
    const updatedEliminations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: juanAntonio.id,
        gameDate: {
          tournament: {
            number: 28
          }
        }
      },
      include: {
        gameDate: {
          select: {
            dateNumber: true
          }
        }
      },
      orderBy: {
        gameDate: {
          dateNumber: 'asc'
        }
      }
    })
    
    let newTotal = 0
    updatedEliminations.forEach(elimination => {
      console.log(`Date ${elimination.gameDate.dateNumber}: Position ${elimination.position}, Points ${elimination.points}`)
      newTotal += elimination.points
    })
    
    console.log('\n📈 Final comparison:')
    console.log('New system total:', newTotal)
    console.log('Expected total (real):', 119)
    console.log('Difference:', newTotal - 119)
    
    if (Math.abs(newTotal - 119) <= 1) {
      console.log('✅ Juan Antonio discrepancy FIXED!')
    } else {
      console.log('⚠️  Still has discrepancy, may need further investigation')
    }
    
  } catch (error) {
    console.error('❌ Error fixing discrepancy:', error)
  }
}

// Run the fix
fixJuanAntonioDiscrepancy()
  .catch(error => {
    console.error('❌ Fix failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })