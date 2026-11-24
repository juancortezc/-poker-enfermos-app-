#!/usr/bin/env tsx

/**
 * Script to manually complete Date 11 by creating Jorge as winner and updating game status
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function completeDate11() {
  console.log('🏆 Manually completing Date 11...')
  
  try {
    // Get Jorge's player ID
    const jorge = await prisma.player.findFirst({
      where: {
        firstName: 'Jorge',
        lastName: 'Tamayo'
      }
    })
    
    if (!jorge) {
      console.error('❌ Jorge not found')
      return
    }
    
    console.log('✅ Found Jorge:', jorge.firstName, jorge.lastName)
    
    // Check current eliminations count
    const eliminationsCount = await prisma.elimination.count({
      where: { gameDateId: 11 }
    })
    
    console.log('📊 Current eliminations count:', eliminationsCount)
    
    // Create Jorge as winner (position 1) - use Jorge as eliminator (self-elimination for winner)
    await prisma.$executeRaw`
      INSERT INTO eliminations (position, points, eliminated_player_id, eliminator_player_id, elimination_time, game_date_id)
      VALUES (1, 26, ${jorge.id}, ${jorge.id}, ${new Date().toISOString()}, 11)
    `
    
    console.log('🏆 Created winner:', jorge.firstName, 'with 26 points')
    
    // Update Jorge's lastVictoryDate
    const gameDate = await prisma.gameDate.findUnique({
      where: { id: 11 },
      select: { scheduledDate: true }
    })
    
    if (gameDate) {
      const victoryDate = gameDate.scheduledDate.toLocaleDateString('es-EC')
      await prisma.player.update({
        where: { id: jorge.id },
        data: { 
          lastVictoryDate: victoryDate
        }
      })
      console.log('📅 Updated Jorge lastVictoryDate to:', victoryDate)
    }
    
    // Update game date status to completed
    const updatedGameDate = await prisma.gameDate.update({
      where: { id: 11 },
      data: { status: 'completed' }
    })
    
    console.log('✅ Updated game date status to:', updatedGameDate.status)
    
    // Final verification
    const finalEliminations = await prisma.elimination.findMany({
      where: { gameDateId: 11 },
      include: {
        eliminatedPlayer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { position: 'desc' }
    })
    
    console.log('\n📋 Final eliminations summary:')
    console.log('Total eliminations:', finalEliminations.length)
    console.log('Winner:', finalEliminations.find(e => e.position === 1)?.eliminatedPlayer.firstName, finalEliminations.find(e => e.position === 1)?.eliminatedPlayer.lastName)
    console.log('Runner-up:', finalEliminations.find(e => e.position === 2)?.eliminatedPlayer.firstName, finalEliminations.find(e => e.position === 2)?.eliminatedPlayer.lastName)
    
    console.log('\n🎉 Date 11 completed successfully!')
    
  } catch (error) {
    console.error('❌ Error completing date 11:', error)
  }
}

// Run the script
completeDate11()
  .catch(error => {
    console.error('❌ Script failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })