#!/usr/bin/env tsx

/**
 * Comprehensive analysis of ALL players in f11.jpeg vs system data
 * Reading every row from the image to identify ALL discrepancies
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Complete real data from f11.jpeg image - every row with TOTAL column
const realDataFromImage = [
  { rank: 1, player: 'Roddy Naranjo', fecha11: 16, total: 196, elimina1: 4, elimina2: 7, final: 185 },
  { rank: 2, player: 'Freddy Lopez', fecha11: 21, total: 163, elimina1: 0, elimina2: 1, final: 162 },
  { rank: 3, player: 'Andres B', fecha11: 7, total: 160, elimina1: 5, elimina2: 7, final: 148 },
  { rank: 4, player: 'Fernando Peña', fecha11: 10, total: 150, elimina1: 2, elimina2: 5, final: 143 },
  { rank: 5, player: 'Miguel Chiesa', fecha11: 5, total: 149, elimina1: 4, elimina2: 4, final: 141 },
  { rank: 6, player: 'Diego Behar', fecha11: 1, total: 143, elimina1: 1, elimina2: 4, final: 138 },
  { rank: 7, player: 'Ruben Cadena', fecha11: 3, total: 141, elimina1: 3, elimina2: 4, final: 134 },
  { rank: 8, player: 'Daniel Vela', fecha11: 24, total: 136, elimina1: 3, elimina2: 6, final: 127 },
  { rank: 9, player: 'Joffre Palacios', fecha11: 15, total: 131, elimina1: 1, elimina2: 2, final: 128 },
  { rank: 10, player: 'Jorge Tamayo', fecha11: 27, total: 121, elimina1: 1, elimina2: 3, final: 117 },
  { rank: 11, player: 'Juan Cortez', fecha11: 11, total: 119, elimina1: 2, elimina2: 2, final: 115 },
  { rank: 12, player: 'Juan Fernando Ochoa', fecha11: 2, total: 117, elimina1: 0, elimina2: 2, final: 115 },
  { rank: 13, player: 'Juan Tapia', fecha11: 0, total: 114, elimina1: 0, elimina2: 2, final: 112 },
  { rank: 14, player: 'Carlos Chacón', fecha11: 18, total: 111, elimina1: 0, elimina2: 0, final: 111 },
  { rank: 15, player: 'Javier Martinez', fecha11: 9, total: 108, elimina1: 0, elimina2: 0, final: 108 },
  { rank: 16, player: 'Damian Amador', fecha11: 8, total: 107, elimina1: 6, elimina2: 7, final: 94 },
  { rank: 17, player: 'Milton Tapia', fecha11: 14, total: 101, elimina1: 1, elimina2: 1, final: 99 },
  { rank: 18, player: 'Sean Willis', fecha11: 6, total: 82, elimina1: 0, elimina2: 1, final: 81 },
  { rank: 19, player: 'Jose Luis Toral', fecha11: 17, total: 74, elimina1: 0, elimina2: 0, final: 74 }
]

async function comprehensiveAnalysis() {
  console.log('🔍 Comprehensive analysis of ALL players: Real vs System data...')
  
  // Get current system ranking
  const response = await fetch('http://localhost:3002/api/tournaments/1/ranking')
  const rankingData = await response.json()
  
  if (!rankingData || !rankingData.rankings) {
    console.error('❌ Could not fetch system ranking data')
    return
  }
  
  console.log('\n📊 COMPLETE COMPARISON TABLE:')
  console.log('RANK | PLAYER NAME         | REAL TOTAL | SYS TOTAL | DIFFERENCE | STATUS')
  console.log('-----|---------------------|------------|-----------|------------|--------')
  
  const discrepancies = []
  let totalSystemPoints = 0
  let totalRealPoints = 0
  
  realDataFromImage.forEach(realPlayer => {
    // Find corresponding player in system
    const systemPlayer = rankingData.rankings.find(sp => {
      const systemName = sp.playerName.toLowerCase()
      
      // Handle name variations
      if (realPlayer.player === 'Juan Cortez') {
        return systemName.includes('juan antonio cortez')
      }
      if (realPlayer.player === 'Andres B') {
        return false // Not in our system
      }
      
      // Try to match by first name and part of last name
      const realNameParts = realPlayer.player.toLowerCase().split(' ')
      return realNameParts.every(part => systemName.includes(part))
    })
    
    if (!systemPlayer) {
      if (realPlayer.player !== 'Andres B') {
        console.log(`${realPlayer.rank.toString().padStart(4)} | ${realPlayer.player.padEnd(19)} | ${realPlayer.total.toString().padStart(10)} | NOT FOUND | ${('N/A').padStart(10)} | ❌ MISSING`)
        discrepancies.push({
          rank: realPlayer.rank,
          player: realPlayer.player,
          realTotal: realPlayer.total,
          systemTotal: 'NOT FOUND',
          difference: 'N/A',
          type: 'missing'
        })
      } else {
        console.log(`${realPlayer.rank.toString().padStart(4)} | ${realPlayer.player.padEnd(19)} | ${realPlayer.total.toString().padStart(10)} | NOT IN SYS| ${('N/A').padStart(10)} | ℹ️  EXTERNAL`)
      }
      totalRealPoints += realPlayer.total
      return
    }
    
    const difference = systemPlayer.totalPoints - realPlayer.total
    const status = difference === 0 ? '✅ OK' : '❌ ERROR'
    
    console.log(`${realPlayer.rank.toString().padStart(4)} | ${realPlayer.player.padEnd(19)} | ${realPlayer.total.toString().padStart(10)} | ${systemPlayer.totalPoints.toString().padStart(9)} | ${difference.toString().padStart(10)} | ${status}`)
    
    if (difference !== 0) {
      discrepancies.push({
        rank: realPlayer.rank,
        player: realPlayer.player,
        systemName: systemPlayer.playerName,
        realTotal: realPlayer.total,
        systemTotal: systemPlayer.totalPoints,
        difference: difference,
        type: 'mismatch'
      })
    }
    
    totalSystemPoints += systemPlayer.totalPoints
    totalRealPoints += realPlayer.total
  })
  
  console.log('-----|---------------------|------------|-----------|------------|--------')
  console.log(`TOTAL|                     | ${totalRealPoints.toString().padStart(10)} | ${totalSystemPoints.toString().padStart(9)} | ${(totalSystemPoints - totalRealPoints).toString().padStart(10)} |`)
  
  console.log('\n📋 DETAILED DISCREPANCY ANALYSIS:')
  if (discrepancies.length === 0) {
    console.log('✅ No discrepancies found!')
  } else {
    console.log(`❌ Found ${discrepancies.length} discrepancies:`)
    
    discrepancies.forEach((disc, index) => {
      console.log(`\n${index + 1}. ${disc.type.toUpperCase()} - Rank ${disc.rank}: ${disc.player}`)
      if (disc.type === 'missing') {
        console.log(`   Real total: ${disc.realTotal} points`)
        console.log(`   System: NOT FOUND`)
      } else {
        console.log(`   Real total: ${disc.realTotal} points`)
        console.log(`   System total: ${disc.systemTotal} points`)
        console.log(`   Difference: ${disc.difference > 0 ? '+' : ''}${disc.difference} points`)
      }
    })
    
    // Analyze only the error cases for detailed investigation
    const errorPlayers = discrepancies.filter(d => d.type === 'mismatch')
    
    if (errorPlayers.length > 0) {
      console.log('\n🔍 DETAILED INVESTIGATION OF ERROR PLAYERS:')
      console.log('Need to analyze date-by-date points for:')
      
      errorPlayers.forEach(player => {
        console.log(`- ${player.player} (${player.systemName}): ${player.difference > 0 ? '+' : ''}${player.difference} points difference`)
      })
      
      console.log('\n📝 Next step: Create date-by-date analysis script for these players')
    }
  }
  
  return { discrepancies, errorPlayers: discrepancies.filter(d => d.type === 'mismatch') }
}

// Run the comprehensive analysis
comprehensiveAnalysis()
  .catch(error => {
    console.error('❌ Analysis failed:', error)
  })