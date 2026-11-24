#!/usr/bin/env tsx

/**
 * Check Date 8 completeness and identify missing eliminations
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDate8Completeness() {
  console.log('🔍 Checking Date 8 completeness...')
  
  const date8 = await prisma.gameDate.findUnique({
    where: { id: 8 },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { position: 'asc' }
      }
    }
  })
  
  if (!date8) {
    console.log('❌ Date 8 not found')
    return
  }
  
  console.log(`Date 8 info:`)
  console.log(`Status: ${date8.status}`)
  console.log(`Players: ${date8.playerIds.length}`)
  console.log(`Eliminations: ${date8.eliminations.length}`)
  
  if (date8.eliminations.length < date8.playerIds.length - 1) {
    console.log('⚠️  Date 8 is incomplete - missing eliminations')
    console.log('Missing eliminations:', date8.playerIds.length - date8.eliminations.length - 1)
  }
  
  console.log('\nEliminations registered:')
  date8.eliminations.forEach(e => {
    const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
    console.log(`Position ${e.position}: ${name} (${e.points} pts)`)
  })
  
  console.log('\nPlayers who participated but have no elimination:')
  for (const playerId of date8.playerIds) {
    const hasElimination = date8.eliminations.find(e => e.eliminatedPlayerId === playerId)
    
    if (!hasElimination) {
      // Get player name
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { firstName: true, lastName: true }
      })
      
      if (player) {
        console.log(`- ${player.firstName} ${player.lastName} (ID: ${playerId})`)
      }
    }
  }
}

// Run the check
checkDate8Completeness()
  .catch(error => {
    console.error('❌ Check failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })