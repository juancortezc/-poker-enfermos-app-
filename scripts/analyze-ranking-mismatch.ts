#!/usr/bin/env tsx

/**
 * Analyze the ranking mismatch between system and real data
 * The system shows different player rankings than the real data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real ranking from f11.jpeg image
const realRanking = [
  { rank: 1, player: 'Roddy Naranjo', total: 196 },
  { rank: 2, player: 'Miguel Chiesa', total: 159 },
  { rank: 3, player: 'Fernando Peña', total: 144 },
  { rank: 4, player: 'Juan Antonio Cortez', total: 145 },
  { rank: 5, player: 'Daniel Vela', total: 136 },
  { rank: 6, player: 'Joffre Palacios', total: 131 },
  { rank: 7, player: 'Jorge Tamayo', total: 121 },
  { rank: 8, player: 'Juan Fernando Ochoa', total: 117 },
  { rank: 9, player: 'Juan Tapia', total: 114 },
  { rank: 10, player: 'Ruben Cadena', total: 113 },
  { rank: 11, player: 'Mono Benites', total: 108 },
  { rank: 12, player: 'Diego Behar', total: 104 },
  { rank: 13, player: 'Milton Tapia', total: 101 },
  { rank: 14, player: 'Sean Willis', total: 99 },
  { rank: 15, player: 'Damian Amador', total: 97 },
  { rank: 16, player: 'Javier Martinez', total: 92 },
  { rank: 17, player: 'Juan Guajardo', total: 86 },
  { rank: 18, player: 'Carlos Chacón', total: 64 },
  { rank: 19, player: 'Agustin Guerrero', total: 63 }
]

async function analyzeRankingMismatch() {
  console.log('🔍 ANALYZING RANKING MISMATCH')
  console.log('Comparing system ranking order vs real ranking order\n')
  
  // Get system ranking
  const response = await fetch('http://localhost:3003/api/tournaments/1/ranking')
  const apiData = await response.json()
  const systemRanking = apiData.rankings
  
  console.log('📊 SIDE BY SIDE COMPARISON:')
  console.log('RANK | REAL PLAYER          | REAL PTS | SYSTEM PLAYER        | SYS PTS | MATCH')
  console.log('-----|----------------------|----------|----------------------|---------|-------')
  
  let positionMatches = 0
  let playerMatches = 0
  
  for (let i = 0; i < Math.max(realRanking.length, systemRanking.length); i++) {
    const realPlayer = realRanking[i]
    const systemPlayer = systemRanking[i]
    
    const realName = realPlayer?.player || 'N/A'
    const realPts = realPlayer?.total || 0
    const systemName = systemPlayer?.playerName || 'N/A'
    const systemPts = systemPlayer?.totalPoints || 0
    
    const rank = i + 1
    
    // Check if same player in same position
    const samePlayer = realName === systemName
    const samePosition = samePlayer && Math.abs(realPts - systemPts) <= 1
    
    if (samePlayer) playerMatches++
    if (samePosition) positionMatches++
    
    const matchStatus = samePlayer ? (samePosition ? '✅ EXACT' : '⚠️  DIFF') : '❌ WRONG'
    
    console.log(`${rank.toString().padStart(4)} | ${realName.padEnd(20)} | ${realPts.toString().padStart(8)} | ${systemName.padEnd(20)} | ${systemPts.toString().padStart(7)} | ${matchStatus}`)
  }
  
  console.log('-----|----------------------|----------|----------------------|---------|-------')
  
  console.log('\n📈 RANKING ANALYSIS:')
  console.log(`✅ Players in correct position: ${positionMatches}/${realRanking.length} (${((positionMatches/realRanking.length)*100).toFixed(1)}%)`)
  console.log(`🔄 Players found but wrong position: ${playerMatches - positionMatches}`)
  console.log(`❌ Players missing/different: ${realRanking.length - playerMatches}`)
  
  // Look for major issues
  console.log('\n🔍 IDENTIFYING MAJOR ISSUES:')
  
  // Check specific problematic players
  const problemPlayers = [
    'Miguel Chiesa',    // Real #2 (159) vs System (149) 
    'Juan Antonio Cortez', // Real #4 (145) vs System (119)
    'Ruben Cadena',     // Real #10 (113) vs System (141)
    'Mono Benites',     // Real #11 (108) vs System (160)
    'Diego Behar'       // Real #12 (104) vs System (143)
  ]
  
  for (const playerName of problemPlayers) {
    const realData = realRanking.find(p => p.player === playerName)
    const systemData = systemRanking.find(p => p.playerName === playerName)
    
    if (realData && systemData) {
      const realPosition = realData.rank
      const systemPosition = systemData.position
      const pointsDiff = systemData.totalPoints - realData.total
      
      console.log(`${playerName}:`)
      console.log(`  Real: Position ${realPosition}, ${realData.total} pts`)
      console.log(`  System: Position ${systemPosition}, ${systemData.totalPoints} pts`)
      console.log(`  Issue: ${pointsDiff > 0 ? '+' : ''}${pointsDiff} points difference, ${Math.abs(systemPosition - realPosition)} positions off`)
      console.log('')
    }
  }
  
  // Check if this is a systematic issue
  console.log('🎯 ROOT CAUSE ANALYSIS:')
  
  const systemTotal = systemRanking.reduce((sum, p) => sum + p.totalPoints, 0)
  const realTotal = realRanking.reduce((sum, p) => sum + p.total, 0)
  
  console.log(`System total points: ${systemTotal}`)
  console.log(`Real total points: ${realTotal}`)
  console.log(`Total difference: ${systemTotal - realTotal}`)
  
  if (systemTotal > realTotal) {
    console.log('\n⚠️  SYSTEM HAS MORE POINTS THAN REAL DATA')
    console.log('This suggests:')
    console.log('1. Some dates have incorrect high scores')
    console.log('2. Duplicate eliminations or wrong point calculations')
    console.log('3. Data import errors creating inflated totals')
  } else {
    console.log('\n⚠️  SYSTEM HAS FEWER POINTS THAN REAL DATA')
    console.log('This suggests:')
    console.log('1. Missing eliminations or dates')
    console.log('2. Some players missing winner points')
    console.log('3. Incomplete data import')
  }
  
  console.log('\n📋 RECOMMENDED ACTIONS:')
  console.log('1. ❌ Date 8 fix was not sufficient - more dates need fixing')
  console.log('2. 🔍 Need to investigate ALL dates, not just Date 8')
  console.log('3. 📊 Real data shows different totals than our current system')
  console.log('4. 🎯 Focus on players with major point differences (>20 pts)')
  console.log('5. 📝 May need complete data re-import from source files')
}

// Run the analysis
analyzeRankingMismatch()
  .catch(error => {
    console.error('❌ Analysis failed:', error)
  })