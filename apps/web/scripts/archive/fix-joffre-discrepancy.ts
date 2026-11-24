#!/usr/bin/env tsx

/**
 * Script to fix Joffre Palacios point discrepancy
 * Issue: Date 11 has 15 points, should have 1 point (position 20)
 * Real total: 131, System total: 132 (+1 difference)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixJoffreDiscrepancy() {
  console.log('🔧 Fixing Joffre Palacios point discrepancy...')
  
  // Get Joffre's player ID
  const joffre = await prisma.player.findFirst({
    where: {
      firstName: 'Joffre',
      lastName: 'Palacios'
    }
  })
  
  if (!joffre) {
    console.error('❌ Joffre not found')
    return
  }
  
  console.log('✅ Found Joffre:', joffre.firstName, joffre.lastName, 'ID:', joffre.id)
  
  try {
    // Fix: Update Date 11 points from 15 to 1 (position 20)
    console.log('\n🔧 Fixing Date 11 points from 15 to 1 (position 20)...')
    
    const date11Elimination = await prisma.elimination.findFirst({
      where: {
        eliminatedPlayerId: joffre.id,
        gameDateId: 11
      }
    })
    
    if (date11Elimination) {
      console.log(`Current Date 11: Position ${date11Elimination.position}, Points ${date11Elimination.points}`)
      
      await prisma.elimination.update({
        where: { id: date11Elimination.id },
        data: { 
          points: 1,
          position: 20
        }
      })
      console.log('✅ Date 11: Updated from 15 pts to 1 pt (position 20)')
    } else {
      console.log('❌ Date 11 elimination not found')
      return
    }
    
    // Verify the fix
    console.log('\n📊 Verification - Joffre\'s eliminations after fix:')
    
    const updatedEliminations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: joffre.id,
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
    console.log('Expected total (real):', 131)
    console.log('Difference:', newTotal - 131)
    
    if (Math.abs(newTotal - 131) <= 1) {
      console.log('✅ Joffre discrepancy FIXED!')
    } else {
      console.log('⚠️  Still has discrepancy, may need further investigation')
    }
    
  } catch (error) {
    console.error('❌ Error fixing discrepancy:', error)
  }
}

// Run the fix
fixJoffreDiscrepancy()
  .catch(error => {
    console.error('❌ Fix failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })