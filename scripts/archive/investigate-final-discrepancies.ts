#!/usr/bin/env tsx

/**
 * Investigate the final 1-point discrepancies remaining after Date 8 fix
 * - Joffre Palacios: +1 point difference (132 vs 131)
 * - Juan Tapia: -1 point difference (113 vs 114)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real data from f11.jpeg for these two players
const remainingDiscrepancies = [
  { name: 'Joffre Palacios', systemTotal: 132, realTotal: 131, difference: +1 },
  { name: 'Juan Tapia', systemTotal: 113, realTotal: 114, difference: -1 }
]

async function investigateFinalDiscrepancies() {
  console.log('🔍 Investigating final 1-point discrepancies after Date 8 fix...')
  
  for (const discrepancy of remainingDiscrepancies) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 ANALYZING: ${discrepancy.name}`)
    console.log(`System: ${discrepancy.systemTotal} | Real: ${discrepancy.realTotal} | Diff: ${discrepancy.difference > 0 ? '+' : ''}${discrepancy.difference}`)
    console.log(`${'='.repeat(60)}`)
    
    // Find player in database
    const nameParts = discrepancy.name.split(' ')
    const player = await prisma.player.findFirst({
      where: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ')
      }
    })
    
    if (!player) {
      console.log(`❌ Player ${discrepancy.name} not found in database`)
      continue
    }
    
    console.log(`✅ Found player: ${player.firstName} ${player.lastName} (ID: ${player.id})`)
    
    // Get all eliminations for Tournament 28
    const eliminations = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: player.id,
        gameDate: {
          tournament: {
            number: 28
          }
        }
      },
      include: {
        gameDate: {
          select: {
            dateNumber: true,
            status: true
          }
        }
      },
      orderBy: {
        gameDate: {
          dateNumber: 'asc'
        }
      }
    })
    
    console.log(`\n📊 Complete elimination history (${eliminations.length} dates):`)
    console.log('DATE | POSITION | POINTS | STATUS')
    console.log('-----|----------|--------|--------')
    
    let systemTotal = 0
    const dateBreakdown = {}
    
    for (const elimination of eliminations) {
      const date = elimination.gameDate.dateNumber
      console.log(`${date.toString().padStart(4)} | ${elimination.position.toString().padStart(8)} | ${elimination.points.toString().padStart(6)} | ${elimination.gameDate.status}`)
      systemTotal += elimination.points
      dateBreakdown[date] = elimination.points
    }
    
    console.log('-----|----------|--------|--------')
    console.log(`TOTAL|          | ${systemTotal.toString().padStart(6)} | Manual Sum`)
    
    // Check which dates this player participated in but has no elimination (potential wins)
    const allGameDates = await prisma.gameDate.findMany({
      where: {
        tournament: { number: 28 },
        status: { in: ['completed', 'in_progress'] }
      },
      select: {
        id: true,
        dateNumber: true,
        playerIds: true,
        status: true
      },
      orderBy: { dateNumber: 'asc' }
    })
    
    console.log('\n🏆 Checking for potential winner dates (participated but no elimination):')
    
    for (const gameDate of allGameDates) {
      const participated = gameDate.playerIds.includes(player.id)
      const hasElimination = eliminations.find(e => e.gameDate.dateNumber === gameDate.dateNumber)
      
      if (participated && !hasElimination) {
        console.log(`🏆 Date ${gameDate.dateNumber}: Participated but no elimination (POTENTIAL WINNER)`)
        
        // Get the total eliminations for this date
        const eliminationCount = await prisma.elimination.count({
          where: { gameDateId: gameDate.id }
        })
        
        const totalPlayers = gameDate.playerIds.length
        console.log(`   Players: ${totalPlayers}, Eliminations: ${eliminationCount}`)
        
        if (eliminationCount === totalPlayers - 1) {
          console.log(`   ✅ CONFIRMED WINNER: ${discrepancy.name} won Date ${gameDate.dateNumber}`)
          
          // Calculate expected winner points
          const secondPlace = await prisma.elimination.findFirst({
            where: {
              gameDateId: gameDate.id,
              position: 2
            }
          })
          
          if (secondPlace) {
            const expectedWinnerPoints = secondPlace.points + 3
            console.log(`   Expected winner points: ${expectedWinnerPoints} (2nd place: ${secondPlace.points} + 3)`)
            dateBreakdown[gameDate.dateNumber] = expectedWinnerPoints
            systemTotal += expectedWinnerPoints
          }
        } else {
          console.log(`   ⚠️  Date incomplete or in progress`)
        }
      }
    }
    
    console.log('\n📅 Complete points breakdown by date:')
    console.log('DATE | POINTS | TYPE')
    console.log('-----|--------|-----')
    
    for (let date = 1; date <= 12; date++) {
      const points = dateBreakdown[date] || 0
      const participated = allGameDates.find(d => d.dateNumber === date)?.playerIds.includes(player.id)
      const hasElimination = eliminations.find(e => e.gameDate.dateNumber === date)
      
      let type = 'N/A'
      if (!participated) type = 'Not Participated'
      else if (points === 0) type = 'Absent'
      else if (hasElimination) type = 'Eliminated'
      else type = 'Winner'
      
      const status = participated ? (points > 0 ? '✅' : '⚠️ ') : '❌'
      console.log(`${date.toString().padStart(4)} | ${points.toString().padStart(6)} | ${type} ${status}`)
    }
    
    console.log('-----|--------|-----')
    console.log(`TOTAL| ${systemTotal.toString().padStart(6)} | System calculated`)
    
    console.log('\n📋 Discrepancy Analysis:')
    console.log(`- System calculated total: ${systemTotal}`)
    console.log(`- Real total (f11.jpeg): ${discrepancy.realTotal}`)
    console.log(`- Current discrepancy: ${discrepancy.difference > 0 ? '+' : ''}${discrepancy.difference} points`)
    
    if (systemTotal !== discrepancy.systemTotal) {
      console.log(`⚠️  WARNING: Our calculation (${systemTotal}) differs from reported system total (${discrepancy.systemTotal})`)
      console.log(`   This suggests potential API calculation differences`)
    }
    
    // Suggest which dates to investigate
    console.log('\n🔍 Investigation suggestions:')
    console.log('1. Check each date where points might be incorrect by 1')
    console.log('2. Look for rounding errors or calculation differences')
    console.log('3. Verify if any eliminations have wrong position/points')
    console.log('4. Check for duplicate or missing eliminations')
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('🎯 FINAL DISCREPANCY SUMMARY:')
  console.log('='.repeat(80))
  
  remainingDiscrepancies.forEach(disc => {
    console.log(`${disc.name.padEnd(20)} | System: ${disc.systemTotal.toString().padStart(3)} | Real: ${disc.realTotal.toString().padStart(3)} | Diff: ${(disc.difference > 0 ? '+' : '') + disc.difference.toString()}`)
  })
  
  console.log('\n📊 After Date 8 complete fix:')
  console.log('- Major discrepancies resolved (Daniel Vela, Jorge Tamayo, etc.)')
  console.log('- Only minor 1-point differences remain')
  console.log('- Likely caused by single elimination position/point errors')
  console.log('- Need detailed date-by-date comparison with real data')
}

// Run the investigation
investigateFinalDiscrepancies()
  .catch(error => {
    console.error('❌ Investigation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })