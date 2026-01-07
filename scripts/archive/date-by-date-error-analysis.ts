#!/usr/bin/env tsx

/**
 * Date-by-date analysis for players with point discrepancies
 * ERROR PLAYERS:
 * - Daniel Vela: +23 points difference (159 vs 136)
 * - Joffre Palacios: +1 points difference (132 vs 131)  
 * - Jorge Tamayo: +24 points difference (145 vs 121)
 * - Juan Fernando Ochoa: +21 points difference (138 vs 117)
 * - Juan Tapia: -1 points difference (113 vs 114)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const errorPlayers = [
  { name: 'Daniel Vela', systemTotal: 159, realTotal: 136, difference: 23 },
  { name: 'Joffre Palacios', systemTotal: 132, realTotal: 131, difference: 1 },
  { name: 'Jorge Tamayo', systemTotal: 145, realTotal: 121, difference: 24 },
  { name: 'Juan Fernando Ochoa', systemTotal: 138, realTotal: 117, difference: 21 },
  { name: 'Juan Tapia', systemTotal: 113, realTotal: 114, difference: -1 }
]

async function dateByDateAnalysis() {
  console.log('🔍 Date-by-date analysis for players with point discrepancies...')
  
  for (const errorPlayer of errorPlayers) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 ANALYZING: ${errorPlayer.name}`)
    console.log(`Real total: ${errorPlayer.realTotal} | System total: ${errorPlayer.systemTotal} | Difference: ${errorPlayer.difference > 0 ? '+' : ''}${errorPlayer.difference}`)
    console.log(`${'='.repeat(60)}`)
    
    // Find player in database
    const nameParts = errorPlayer.name.split(' ')
    const player = await prisma.player.findFirst({
      where: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ')
      }
    })
    
    if (!player) {
      console.log(`❌ Player ${errorPlayer.name} not found in database`)
      continue
    }
    
    // Get all eliminations for this player in Tournament 28
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
    
    console.log('\n📅 Date-by-date points breakdown:')
    console.log('DATE | SYSTEM PTS | NOTES')
    console.log('-----|------------|------')
    
    let systemRunningTotal = 0
    
    for (let date = 1; date <= 12; date++) {
      const elimination = eliminations.find(e => e.gameDate.dateNumber === date)
      
      if (elimination) {
        systemRunningTotal += elimination.points
        console.log(`${date.toString().padStart(4)} | ${elimination.points.toString().padStart(10)} | Position ${elimination.position}`)
      } else {
        console.log(`${date.toString().padStart(4)} | ${('0').padStart(10)} | Not participated/Absent`)
      }
    }
    
    console.log('-----|------------|------')
    console.log(`TOTAL| ${systemRunningTotal.toString().padStart(10)} | System calculated total`)
    
    console.log('\n📊 Summary:')
    console.log(`- System calculated total: ${systemRunningTotal}`)
    console.log(`- System API total: ${errorPlayer.systemTotal}`)
    console.log(`- Real total (f11.jpeg): ${errorPlayer.realTotal}`)
    console.log(`- Discrepancy vs real: ${errorPlayer.difference > 0 ? '+' : ''}${errorPlayer.difference} points`)
    
    if (systemRunningTotal !== errorPlayer.systemTotal) {
      console.log(`⚠️  WARNING: Manual calculation (${systemRunningTotal}) differs from API total (${errorPlayer.systemTotal})`)
    }
    
    // Check for specific date issues
    console.log('\n🔍 Potential issues to investigate:')
    console.log('- Check if any dates have incorrect points')
    console.log('- Verify if player participated in all listed dates')
    console.log('- Look for missing eliminations')
    console.log('- Check for duplicate eliminations')
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📋 SUMMARY OF ALL ERROR PLAYERS:')
  console.log('='.repeat(80))
  
  let totalDiscrepancy = 0
  errorPlayers.forEach(player => {
    console.log(`${player.name.padEnd(20)} | Real: ${player.realTotal.toString().padStart(3)} | System: ${player.systemTotal.toString().padStart(3)} | Diff: ${(player.difference > 0 ? '+' : '') + player.difference.toString().padStart(3)}`)
    totalDiscrepancy += player.difference
  })
  
  console.log('-'.repeat(80))
  console.log(`${'TOTAL DISCREPANCY'.padEnd(20)} | ${' '.repeat(10)} | ${' '.repeat(8)} | ${(totalDiscrepancy > 0 ? '+' : '') + totalDiscrepancy.toString().padStart(3)}`)
  
  console.log('\n🎯 NEXT STEPS:')
  console.log('1. Investigate each player\'s eliminations date by date')
  console.log('2. Compare with real tournament data for each date')
  console.log('3. Identify and fix incorrect point assignments')
  console.log('4. Verify elimination records exist for all dates played')
  console.log('5. Check for any missing or extra eliminations')
}

// Run the date-by-date analysis
dateByDateAnalysis()
  .catch(error => {
    console.error('❌ Analysis failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })