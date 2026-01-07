#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDiegoTotal() {
  console.log('🔍 FINAL VERIFICATION - DIEGO BEHAR TOTAL SCORE')
  console.log('='.repeat(60))
  
  try {
    // Find Diego
    const diego = await prisma.player.findFirst({
      where: {
        firstName: { contains: 'Diego', mode: 'insensitive' },
        lastName: { contains: 'Behar', mode: 'insensitive' }
      }
    })
    
    if (!diego) {
      console.log('❌ Diego not found')
      return
    }
    
    // Get all his eliminations in tournament 28
    const eliminations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: diego.id,
        gameDate: {
          tournamentId: 1 // Tournament 28
        }
      },
      include: {
        gameDate: true
      },
      orderBy: {
        gameDate: { dateNumber: 'asc' }
      }
    })
    
    console.log(`Diego Behar eliminations in Tournament 28 (${eliminations.length} total):`)
    let totalPoints = 0
    eliminations.forEach(e => {
      console.log(`  Date ${e.gameDate.dateNumber}: ${e.points} points (Position ${e.position})`)
      totalPoints += e.points
    })
    
    console.log(`\nCalculated Total Points: ${totalPoints}`)
    console.log('Expected Total (from authoritative data): 104')
    console.log(`Match: ${totalPoints === 104 ? '✅ YES' : '❌ NO'}`)
    
    if (totalPoints !== 104) {
      console.log(`\nDifference: ${totalPoints - 104} points`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDiegoTotal().catch(console.error)