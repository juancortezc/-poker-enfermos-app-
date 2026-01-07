#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateDiego() {
  console.log('🔍 INVESTIGATING DIEGO BEHAR DATE 11 ISSUE')
  console.log('='.repeat(60))
  
  try {
    // Find Diego's player ID
    const diego = await prisma.player.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'Diego', mode: 'insensitive' } },
          { lastName: { contains: 'Behar', mode: 'insensitive' } }
        ]
      }
    })
    
    if (!diego) {
      console.log('❌ Diego Behar not found in database')
      return
    }
    
    console.log(`✅ Found Diego: ID=${diego.id}, Name=${diego.firstName} ${diego.lastName}`)
    
    // Check if he participated in date 11
    const gameDate11 = await prisma.gameDate.findFirst({
      where: { 
        dateNumber: 11,
        tournamentId: 1 // Tournament 28
      }
    })
    
    if (!gameDate11) {
      console.log('❌ Date 11 not found')
      return
    }
    
    console.log(`✅ Found Date 11: ID=${gameDate11.id}, Status=${gameDate11.status}`)
    console.log(`   PlayerIds: ${gameDate11.playerIds}`)
    
    const participatedInDate11 = gameDate11.playerIds.includes(diego.id)
    console.log(`   Diego participated in Date 11: ${participatedInDate11}`)
    
    // Check for elimination record
    const elimination = await prisma.elimination.findFirst({
      where: {
        gameDateId: gameDate11.id,
        eliminatedPlayerId: diego.id
      }
    })
    
    if (elimination) {
      console.log(`✅ Found elimination record: Position=${elimination.position}, Points=${elimination.points}`)
    } else {
      console.log('❌ No elimination record found for Diego in Date 11')
    }
    
    // Check all eliminations for date 11
    const allEliminations = await prisma.elimination.findMany({
      where: { gameDateId: gameDate11.id },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      },
      orderBy: { position: 'desc' }
    })
    
    console.log(`\nAll Date 11 eliminations (${allEliminations.length} total):`)
    allEliminations.forEach(e => {
      const eliminated = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      const eliminator = e.eliminatorPlayer ? `${e.eliminatorPlayer.firstName} ${e.eliminatorPlayer.lastName}` : 'Winner'
      console.log(`  Position ${e.position}: ${eliminated} (${e.points} pts) - by ${eliminator}`)
    })
    
    // Show what Diego SHOULD have according to authoritative data
    console.log('\n🎯 AUTHORITATIVE DATA:')
    console.log('According to f11.jpeg image: Diego Behar should have 1 point in date 11')
    console.log('According to tournament-28-authoritative-data.json: Diego eliminated at position 20 with 1 point')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

investigateDiego().catch(console.error)