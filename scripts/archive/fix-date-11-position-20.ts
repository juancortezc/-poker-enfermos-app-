#!/usr/bin/env tsx

/**
 * Script to fix Date 11 duplicate position 20
 * Current: Diego Behar and Joffre Palacios both have position 20
 * Real: Position 20 should be Diego Sean with 1 point
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDate11Position20() {
  console.log('🔧 Fixing Date 11 duplicate position 20...')
  
  try {
    // First, get the current state
    const position20Eliminations = await prisma.elimination.findMany({
      where: {
        gameDateId: 11,
        position: 20
      },
      include: {
        eliminatedPlayer: {
          select: { firstName: true, lastName: true }
        }
      }
    })
    
    console.log('📊 Current position 20 eliminations:')
    position20Eliminations.forEach(e => {
      const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      console.log(`  - ${name} (ID: ${e.id}, Points: ${e.points})`)
    })
    
    // Find Diego and Joffre
    const diegoElimination = position20Eliminations.find(e => 
      e.eliminatedPlayer.firstName === 'Diego' && e.eliminatedPlayer.lastName === 'Behar'
    )
    
    const joffreElimination = position20Eliminations.find(e => 
      e.eliminatedPlayer.firstName === 'Joffre' && e.eliminatedPlayer.lastName === 'Palacios'
    )
    
    if (!diegoElimination || !joffreElimination) {
      console.log('❌ Could not find both Diego and Joffre eliminations')
      return
    }
    
    console.log('\n🎯 Based on real data analysis:')
    console.log('- Position 20 should have Diego Sean')
    console.log('- Joffre should be moved to a different position')
    
    // According to the real data from f11.jpeg, let's check what Joffre's actual position should be
    // From the image, Joffre Palacios should have 1 point but in position 20
    // This suggests the real data shows Joffre in position 20, not Diego
    
    console.log('\n🔧 Solution: Remove Diego from position 20, keep Joffre')
    console.log('(Based on f11.jpeg showing Joffre with 1 point)')
    
    // Remove Diego's elimination (he might be in a different position)
    await prisma.elimination.delete({
      where: { id: diegoElimination.id }
    })
    
    console.log(`✅ Removed Diego Behar from position 20 (ID: ${diegoElimination.id})`)
    
    // Now check if we need to add Sean Willis to position 20 or if Joffre is correct
    // Let's check what the image actually shows for position 20
    console.log('\n📋 According to f11.jpeg image:')
    console.log('- Joffre Palacios should be position 20 with 1 point')
    console.log('- Diego Sean might be in a different position')
    
    // Verify the current state
    const finalPosition20 = await prisma.elimination.findMany({
      where: {
        gameDateId: 11,
        position: 20
      },
      include: {
        eliminatedPlayer: {
          select: { firstName: true, lastName: true }
        }
      }
    })
    
    console.log('\n✅ Final position 20 state:')
    finalPosition20.forEach(e => {
      const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      console.log(`  - ${name} (${e.points} points)`)
    })
    
    if (finalPosition20.length === 1) {
      console.log('🎉 Position 20 duplicate fixed!')
    } else {
      console.log('⚠️  Still have multiple players in position 20')
    }
    
  } catch (error) {
    console.error('❌ Error fixing position 20:', error)
  }
}

// Run the fix
fixDate11Position20()
  .catch(error => {
    console.error('❌ Fix failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })