#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDiegoDate11() {
  console.log('🔧 FIXING DIEGO BEHAR DATE 11 MISSING ELIMINATION')
  console.log('='.repeat(60))
  
  try {
    // Find Diego's player ID
    const diego = await prisma.player.findFirst({
      where: {
        firstName: { contains: 'Diego', mode: 'insensitive' },
        lastName: { contains: 'Behar', mode: 'insensitive' }
      }
    })
    
    if (!diego) {
      console.log('❌ Diego Behar not found')
      return
    }
    
    console.log(`✅ Found Diego: ${diego.firstName} ${diego.lastName} (ID: ${diego.id})`)
    
    // Find Sean Willis (his eliminator according to authoritative data)
    const sean = await prisma.player.findFirst({
      where: {
        firstName: { contains: 'Sean', mode: 'insensitive' },
        lastName: { contains: 'Willis', mode: 'insensitive' }
      }
    })
    
    if (!sean) {
      console.log('❌ Sean Willis not found')
      return
    }
    
    console.log(`✅ Found Sean Willis: ${sean.firstName} ${sean.lastName} (ID: ${sean.id})`)
    
    // Get date 11
    const gameDate11 = await prisma.gameDate.findFirst({
      where: { 
        dateNumber: 11,
        tournamentId: 1
      }
    })
    
    if (!gameDate11) {
      console.log('❌ Date 11 not found')
      return
    }
    
    // Check if Diego already has an elimination record
    const existingElimination = await prisma.elimination.findFirst({
      where: {
        gameDateId: gameDate11.id,
        eliminatedPlayerId: diego.id
      }
    })
    
    if (existingElimination) {
      console.log('❌ Diego already has an elimination record in Date 11')
      console.log(`   Current: Position ${existingElimination.position}, Points ${existingElimination.points}`)
      return
    }
    
    // Create the missing elimination record
    console.log('\n🎯 Creating Diego\'s elimination record...')
    console.log('   Position: 20 (worst position)')
    console.log('   Points: 1')
    console.log('   Eliminator: Sean Willis')
    
    const newElimination = await prisma.elimination.create({
      data: {
        gameDateId: gameDate11.id,
        eliminatedPlayerId: diego.id,
        eliminatorPlayerId: sean.id,
        position: 20,
        points: 1,
        eliminationTime: new Date().toISOString()
      }
    })
    
    console.log(`✅ Created elimination record with ID: ${newElimination.id}`)
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...')
    const verifyElimination = await prisma.elimination.findFirst({
      where: {
        gameDateId: gameDate11.id,
        eliminatedPlayerId: diego.id
      },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      }
    })
    
    if (verifyElimination) {
      console.log('✅ Verification successful:')
      console.log(`   Player: ${verifyElimination.eliminatedPlayer.firstName} ${verifyElimination.eliminatedPlayer.lastName}`)
      console.log(`   Position: ${verifyElimination.position}`)
      console.log(`   Points: ${verifyElimination.points}`)
      console.log(`   Eliminator: ${verifyElimination.eliminatorPlayer?.firstName} ${verifyElimination.eliminatorPlayer?.lastName}`)
    }
    
    // Show updated elimination count
    const totalEliminations = await prisma.elimination.count({
      where: { gameDateId: gameDate11.id }
    })
    
    console.log(`\n📊 Total eliminations in Date 11: ${totalEliminations}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDiegoDate11().catch(console.error)