#!/usr/bin/env tsx

/**
 * Final validation comparing ALL players between system and real data
 * After Date 8 fix and all corrections, verify remaining discrepancies
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Complete real data from f11.jpeg image
const realDataFromImage = [
  { rank: 1, player: 'Roddy Naranjo', fecha11: 16, total: 196, elimina1: 4, elimina2: 7, final: 185 },
  { rank: 2, player: 'Miguel Chiesa', fecha11: 7, total: 159, elimina1: 5, elimina2: 8, final: 148 },
  { rank: 3, player: 'Fernando Peña', fecha11: 0, total: 144, elimina1: 9, elimina2: 11, final: 144 },
  { rank: 4, player: 'Juan Antonio Cortez', fecha11: 11, total: 145, elimina1: 6, elimina2: 12, final: 134 },
  { rank: 5, player: 'Daniel Vela', fecha11: 10, total: 136, elimina1: 7, elimina2: 14, final: 129 },
  { rank: 6, player: 'Joffre Palacios', fecha11: 15, total: 131, elimina1: 10, elimina2: 15, final: 116 },
  { rank: 7, player: 'Jorge Tamayo', fecha11: 27, total: 121, elimina1: 8, elimina2: 16, final: 113 },
  { rank: 8, player: 'Juan Fernando Ochoa', fecha11: 0, total: 117, elimina1: 11, elimina2: 17, final: 117 },
  { rank: 9, player: 'Juan Tapia', fecha11: 0, total: 114, elimina1: 12, elimina2: 18, final: 114 },
  { rank: 10, player: 'Ruben Cadena', fecha11: 0, total: 113, elimina1: 13, elimina2: 19, final: 113 },
  { rank: 11, player: 'Mono Benites', fecha11: 0, total: 108, elimina1: 14, elimina2: 20, final: 108 },
  { rank: 12, player: 'Diego Behar', fecha11: 20, total: 104, elimina1: 15, elimina2: 21, final: 84 },
  { rank: 13, player: 'Milton Tapia', fecha11: 0, total: 101, elimina1: 16, elimina2: 22, final: 101 },
  { rank: 14, player: 'Sean Willis', fecha11: 0, total: 99, elimina1: 17, elimina2: 23, final: 99 },
  { rank: 15, player: 'Damian Amador', fecha11: 0, total: 97, elimina1: 18, elimina2: 24, final: 97 },
  { rank: 16, player: 'Javier Martinez', fecha11: 0, total: 92, elimina1: 19, elimina2: 25, final: 92 },
  { rank: 17, player: 'Juan Guajardo', fecha11: 0, total: 86, elimina1: 20, elimina2: 26, final: 86 },
  { rank: 18, player: 'Carlos Chacón', fecha11: 0, total: 64, elimina1: 21, elimina2: 27, final: 64 },
  { rank: 19, player: 'Agustin Guerrero', fecha11: 0, total: 63, elimina1: 22, elimina2: 28, final: 63 }
]

async function finalValidationAllPlayers() {
  console.log('🎯 FINAL VALIDATION: Comparing ALL players (System vs Real Data)')
  console.log('After Date 8 fix and all corrections\n')
  
  // Get all players from Tournament 28 ranking
  const response = await fetch('http://localhost:3003/api/tournaments/1/ranking')
  const apiData = await response.json()
  
  if (!apiData.rankings) {
    console.error('❌ Failed to fetch ranking data:', apiData)
    return
  }
  
  const systemPlayers = apiData.rankings
  
  console.log('📊 COMPREHENSIVE COMPARISON:')
  console.log('RANK | PLAYER NAME          | SYSTEM | REAL | DIFF | STATUS')
  console.log('-----|----------------------|--------|------|------|--------')
  
  let exactMatches = 0
  let totalDiscrepancy = 0
  const errorPlayers = []
  
  // Compare each player
  for (const realPlayer of realDataFromImage) {
    const systemPlayer = systemPlayers.find(sp => sp.playerName === realPlayer.player)
    
    if (!systemPlayer) {
      console.log(`${realPlayer.rank.toString().padStart(4)} | ${realPlayer.player.padEnd(20)} | ${'N/A'.padStart(6)} | ${realPlayer.total.toString().padStart(4)} | ${'?'.padStart(4)} | NOT FOUND`)
      continue
    }
    
    const systemTotal = systemPlayer.totalPoints
    const realTotal = realPlayer.total
    const difference = systemTotal - realTotal
    
    let status = '✅ EXACT'
    if (difference !== 0) {
      status = difference > 0 ? `❌ +${difference}` : `❌ ${difference}`
      errorPlayers.push({
        name: realPlayer.player,
        systemTotal,
        realTotal,
        difference
      })
    } else {
      exactMatches++
    }
    
    console.log(`${realPlayer.rank.toString().padStart(4)} | ${realPlayer.player.padEnd(20)} | ${systemTotal.toString().padStart(6)} | ${realTotal.toString().padStart(4)} | ${difference > 0 ? '+' : ''}${difference.toString().padStart(4)} | ${status}`)
    totalDiscrepancy += difference
  }
  
  console.log('-----|----------------------|--------|------|------|--------')
  
  // Summary statistics
  console.log('\n📈 VALIDATION SUMMARY:')
  console.log(`✅ Exact matches: ${exactMatches}/${realDataFromImage.length} players (${((exactMatches/realDataFromImage.length)*100).toFixed(1)}%)`)
  console.log(`❌ Players with errors: ${errorPlayers.length}`)
  console.log(`📊 Total discrepancy: ${totalDiscrepancy > 0 ? '+' : ''}${totalDiscrepancy} points`)
  
  if (errorPlayers.length > 0) {
    console.log('\n🔍 REMAINING ERROR PLAYERS:')
    errorPlayers.forEach(player => {
      console.log(`- ${player.name}: ${player.difference > 0 ? '+' : ''}${player.difference} points (System: ${player.systemTotal}, Real: ${player.realTotal})`)
    })
  }
  
  // Check system totals
  const systemGrandTotal = systemPlayers.reduce((sum, p) => sum + p.totalPoints, 0)
  const realGrandTotal = realDataFromImage.reduce((sum, p) => sum + p.total, 0)
  
  console.log('\n🎯 GRAND TOTALS:')
  console.log(`System grand total: ${systemGrandTotal}`)
  console.log(`Real grand total: ${realGrandTotal}`)
  console.log(`Grand total difference: ${systemGrandTotal - realGrandTotal}`)
  
  // Success criteria
  console.log('\n🏆 SUCCESS CRITERIA:')
  if (exactMatches >= 17) {
    console.log(`✅ SUCCESS: ${exactMatches}/19 players match exactly (≥89% accuracy)`)
  } else {
    console.log(`⚠️  NEEDS WORK: Only ${exactMatches}/19 players match exactly (<89% accuracy)`)
  }
  
  if (Math.abs(totalDiscrepancy) <= 5) {
    console.log(`✅ SUCCESS: Total discrepancy is only ${Math.abs(totalDiscrepancy)} points (≤5 acceptable)`)
  } else {
    console.log(`⚠️  NEEDS WORK: Total discrepancy is ${Math.abs(totalDiscrepancy)} points (>5)`)
  }
  
  // Final conclusion
  console.log('\n' + '='.repeat(80))
  console.log('🎯 FINAL CONCLUSION:')
  console.log('='.repeat(80))
  
  if (exactMatches >= 17 && Math.abs(totalDiscrepancy) <= 5) {
    console.log('✅ DATA QUALITY: EXCELLENT')
    console.log('✅ The tournament data is highly accurate after all fixes')
    console.log('✅ Minor discrepancies remaining are within acceptable tolerance')
    console.log('✅ System is ready for production use')
  } else if (exactMatches >= 15) {
    console.log('⚠️  DATA QUALITY: GOOD')
    console.log('⚠️  Most data is accurate but some discrepancies remain')
    console.log('⚠️  Consider investigating remaining errors if critical')
  } else {
    console.log('❌ DATA QUALITY: NEEDS IMPROVEMENT')
    console.log('❌ Significant discrepancies remain')
    console.log('❌ Further investigation and fixes required')
  }
  
  console.log('\n📋 NEXT STEPS:')
  if (errorPlayers.length > 0 && errorPlayers.length <= 3) {
    console.log('1. Minor discrepancies detected - acceptable for production')
    console.log('2. Consider detailed investigation only if perfect accuracy required')
    console.log('3. Current accuracy level is sufficient for tournament operation')
  } else if (errorPlayers.length > 3) {
    console.log('1. Multiple discrepancies need investigation')
    console.log('2. Review each error player date-by-date')
    console.log('3. Identify systematic issues in data entry')
  } else {
    console.log('🎉 PERFECT! All players match exactly!')
    console.log('🚀 System ready for immediate production deployment')
  }
}

// Run the final validation
finalValidationAllPlayers()
  .catch(error => {
    console.error('❌ Final validation failed:', error)
  })