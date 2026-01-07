#!/usr/bin/env tsx

/**
 * COMPREHENSIVE DATA VALIDATION AUDIT
 * Complete audit of Tournament 28 data integrity across all dates
 * Validates against tournament algorithm and identifies all discrepancies
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Real ranking data from f11.jpeg image for final validation
const realFinalRanking = [
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

interface AuditResult {
  date: number
  issues: string[]
  validationStatus: 'PASS' | 'FAIL' | 'WARNING'
  participants: number
  eliminations: number
  expectedEliminations: number
  pointsTotal: number
  expectedPointsTotal: number
}

interface PlayerAudit {
  playerId: string
  playerName: string
  systemTotal: number
  realTotal: number
  difference: number
  dateBreakdown: { [date: number]: number }
  issues: string[]
}

// Tournament points calculation algorithm (from tournament-utils.ts)
function calculateExpectedPoints(position: number, totalPlayers: number): number {
  if (position === 1) return totalPlayers; // Winner gets max points
  
  const lastPlace = totalPlayers;
  const secondLastPlace = lastPlace - 1;
  
  if (position === lastPlace) return 1; // Last place gets 1 point
  if (position >= Math.min(10, secondLastPlace)) {
    return position - lastPlace + 1;
  }
  
  // Positions 9 and above
  const pos9Points = Math.max(2, Math.min(10, secondLastPlace) - lastPlace + 1 + 1);
  if (position === 9) return pos9Points;
  
  // Positions 8-4
  if (position >= 4) {
    return pos9Points + (9 - position);
  }
  
  // Positions 3, 2, 1 - big jumps
  const pos4Points = pos9Points + (9 - 4);
  if (position === 3) return pos4Points + 3;
  if (position === 2) return pos4Points + 6;
  if (position === 1) return pos4Points + 9;
  
  return 1; // fallback
}

async function comprehensiveDataAudit() {
  console.log('🔍 COMPREHENSIVE DATA VALIDATION AUDIT')
  console.log('Validating Tournament 28 data integrity across all dates...\n')
  
  const tournament = await prisma.tournament.findFirst({
    where: { number: 28 },
    include: {
      gameDates: {
        include: {
          eliminations: {
            include: {
              eliminatedPlayer: { select: { firstName: true, lastName: true } },
              eliminatorPlayer: { select: { firstName: true, lastName: true } }
            }
          }
        },
        orderBy: { dateNumber: 'asc' }
      }
    }
  })
  
  if (!tournament) {
    console.error('❌ Tournament 28 not found')
    return
  }
  
  console.log(`📊 TOURNAMENT 28 OVERVIEW:`)
  console.log(`Tournament ID: ${tournament.id}`)
  console.log(`Status: ${tournament.status}`)
  console.log(`Game Dates: ${tournament.gameDates.length}`)
  console.log(`Total Eliminations: ${tournament.gameDates.reduce((sum, gd) => sum + gd.eliminations.length, 0)}`)
  console.log('')
  
  const auditResults: AuditResult[] = []
  const playerTotals: { [playerName: string]: PlayerAudit } = {}
  
  // Initialize player audits
  for (const realPlayer of realFinalRanking) {
    playerTotals[realPlayer.player] = {
      playerId: '',
      playerName: realPlayer.player,
      systemTotal: 0,
      realTotal: realPlayer.total,
      difference: 0,
      dateBreakdown: {},
      issues: []
    }
  }
  
  // Audit each game date
  for (const gameDate of tournament.gameDates) {
    console.log(`🔍 AUDITING DATE ${gameDate.dateNumber}`)
    console.log(`Status: ${gameDate.status}`)
    console.log(`Scheduled: ${new Date(gameDate.scheduledDate).toLocaleDateString()}`)
    
    const issues: string[] = []
    const participants = gameDate.playerIds.length
    const eliminations = gameDate.eliminations.length
    const expectedEliminations = gameDate.status === 'completed' ? participants - 1 : 0
    
    // 1. Check elimination count
    if (gameDate.status === 'completed' && eliminations !== expectedEliminations) {
      issues.push(`❌ Elimination count mismatch: ${eliminations} vs expected ${expectedEliminations}`)
    }
    
    // 2. Check position sequence
    const positions = gameDate.eliminations.map(e => e.position).sort((a, b) => a - b)
    const expectedPositions = Array.from({ length: eliminations }, (_, i) => i + 1)
    
    if (JSON.stringify(positions) !== JSON.stringify(expectedPositions.slice(0, eliminations))) {
      issues.push(`❌ Position sequence invalid: [${positions.join(', ')}] vs expected [${expectedPositions.slice(0, eliminations).join(', ')}]`)
    }
    
    // 3. Check points calculation
    let actualPointsTotal = 0
    let expectedPointsTotal = 0
    
    for (const elimination of gameDate.eliminations) {
      const actualPoints = elimination.points
      const expectedPoints = calculateExpectedPoints(elimination.position, participants)
      
      actualPointsTotal += actualPoints
      expectedPointsTotal += expectedPoints
      
      if (actualPoints !== expectedPoints) {
        const playerName = `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`
        issues.push(`❌ Points mismatch for ${playerName} pos ${elimination.position}: ${actualPoints} vs expected ${expectedPoints}`)
      }
      
      // Track player totals
      const playerName = `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`
      if (playerTotals[playerName]) {
        playerTotals[playerName].systemTotal += actualPoints
        playerTotals[playerName].dateBreakdown[gameDate.dateNumber] = actualPoints
        playerTotals[playerName].playerId = elimination.eliminatedPlayerId
      }
    }
    
    // 4. Check for duplicate players
    const eliminatedPlayerIds = gameDate.eliminations.map(e => e.eliminatedPlayerId)
    const uniquePlayerIds = [...new Set(eliminatedPlayerIds)]
    if (eliminatedPlayerIds.length !== uniquePlayerIds.length) {
      issues.push(`❌ Duplicate player eliminations detected`)
    }
    
    // 5. Check for players in eliminations but not in participants
    for (const elimination of gameDate.eliminations) {
      if (!gameDate.playerIds.includes(elimination.eliminatedPlayerId)) {
        const playerName = `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`
        issues.push(`⚠️  ${playerName} eliminated but not in participant list`)
      }
    }
    
    const auditResult: AuditResult = {
      date: gameDate.dateNumber,
      issues,
      validationStatus: issues.length === 0 ? 'PASS' : (issues.some(i => i.startsWith('❌')) ? 'FAIL' : 'WARNING'),
      participants,
      eliminations,
      expectedEliminations,
      pointsTotal: actualPointsTotal,
      expectedPointsTotal
    }
    
    auditResults.push(auditResult)
    
    // Report results for this date
    const status = auditResult.validationStatus === 'PASS' ? '✅' : 
                   auditResult.validationStatus === 'WARNING' ? '⚠️ ' : '❌'
    
    console.log(`${status} Status: ${auditResult.validationStatus}`)
    console.log(`   Participants: ${participants}`)
    console.log(`   Eliminations: ${eliminations}/${expectedEliminations}`)
    console.log(`   Points Total: ${actualPointsTotal}/${expectedPointsTotal}`)
    
    if (issues.length > 0) {
      console.log(`   Issues:`)
      issues.forEach(issue => console.log(`     ${issue}`))
    }
    console.log('')
  }
  
  // Calculate player differences and issues
  for (const playerName in playerTotals) {
    const audit = playerTotals[playerName]
    audit.difference = audit.systemTotal - audit.realTotal
    
    if (Math.abs(audit.difference) > 0) {
      audit.issues.push(`${audit.difference > 0 ? '+' : ''}${audit.difference} points vs real data`)
    }
  }
  
  // FINAL AUDIT SUMMARY
  console.log('=' * 80)
  console.log('📊 COMPREHENSIVE AUDIT SUMMARY')
  console.log('=' * 80)
  
  const passCount = auditResults.filter(a => a.validationStatus === 'PASS').length
  const warningCount = auditResults.filter(a => a.validationStatus === 'WARNING').length
  const failCount = auditResults.filter(a => a.validationStatus === 'FAIL').length
  
  console.log(`\n📈 DATE VALIDATION RESULTS:`)
  console.log(`✅ PASS: ${passCount}/${auditResults.length} dates`)
  console.log(`⚠️  WARNING: ${warningCount}/${auditResults.length} dates`)
  console.log(`❌ FAIL: ${failCount}/${auditResults.length} dates`)
  
  // Show failed dates
  if (failCount > 0) {
    console.log(`\n❌ FAILED DATES:`)
    auditResults.filter(a => a.validationStatus === 'FAIL').forEach(audit => {
      console.log(`   Date ${audit.date}: ${audit.issues.length} issues`)
      audit.issues.forEach(issue => console.log(`     ${issue}`))
    })
  }
  
  // Player accuracy analysis
  const exactPlayerMatches = Object.values(playerTotals).filter(p => p.difference === 0).length
  const totalPlayers = Object.keys(playerTotals).length
  
  console.log(`\n👥 PLAYER ACCURACY:`)
  console.log(`✅ Exact matches: ${exactPlayerMatches}/${totalPlayers} (${((exactPlayerMatches/totalPlayers)*100).toFixed(1)}%)`)
  console.log(`❌ Players with errors: ${totalPlayers - exactPlayerMatches}`)
  
  // Show top error players
  const errorPlayers = Object.values(playerTotals)
    .filter(p => p.difference !== 0)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, 10)
  
  if (errorPlayers.length > 0) {
    console.log(`\n🔍 TOP ERROR PLAYERS:`)
    errorPlayers.forEach(player => {
      console.log(`   ${player.playerName}: ${player.difference > 0 ? '+' : ''}${player.difference} pts (${player.systemTotal} vs ${player.realTotal})`)
    })
  }
  
  // System vs Real totals
  const systemGrandTotal = Object.values(playerTotals).reduce((sum, p) => sum + p.systemTotal, 0)
  const realGrandTotal = Object.values(playerTotals).reduce((sum, p) => sum + p.realTotal, 0)
  
  console.log(`\n🎯 GRAND TOTALS:`)
  console.log(`System total: ${systemGrandTotal}`)
  console.log(`Real total: ${realGrandTotal}`)
  console.log(`Difference: ${systemGrandTotal - realGrandTotal} points`)
  
  // Final assessment
  console.log(`\n🏆 OVERALL DATA QUALITY ASSESSMENT:`)
  
  const overallAccuracy = (exactPlayerMatches / totalPlayers) * 100
  const dateSuccessRate = (passCount / auditResults.length) * 100
  
  if (overallAccuracy >= 95 && dateSuccessRate >= 90) {
    console.log(`✅ EXCELLENT (${overallAccuracy.toFixed(1)}% player accuracy, ${dateSuccessRate.toFixed(1)}% date success)`)
  } else if (overallAccuracy >= 80 && dateSuccessRate >= 70) {
    console.log(`⚠️  GOOD (${overallAccuracy.toFixed(1)}% player accuracy, ${dateSuccessRate.toFixed(1)}% date success)`)
  } else if (overallAccuracy >= 50 && dateSuccessRate >= 50) {
    console.log(`❌ POOR (${overallAccuracy.toFixed(1)}% player accuracy, ${dateSuccessRate.toFixed(1)}% date success)`)
  } else {
    console.log(`💥 CRITICAL (${overallAccuracy.toFixed(1)}% player accuracy, ${dateSuccessRate.toFixed(1)}% date success)`)
  }
  
  console.log(`\n📋 RECOMMENDED ACTION:`)
  if (overallAccuracy < 95 || dateSuccessRate < 90) {
    console.log(`🔨 COMPLETE DATA REBUILD REQUIRED`)
    console.log(`   - Current data quality is insufficient for production`)
    console.log(`   - Systematic errors detected across multiple dates`)
    console.log(`   - Rebuild from authoritative source data recommended`)
  } else {
    console.log(`✨ MINOR FIXES SUFFICIENT`)
    console.log(`   - Data quality is acceptable with minor corrections`)
    console.log(`   - Target specific date/player issues identified`)
  }
  
  return {
    auditResults,
    playerTotals,
    summary: {
      overallAccuracy,
      dateSuccessRate,
      systemGrandTotal,
      realGrandTotal,
      exactPlayerMatches,
      totalPlayers,
      recommendedAction: overallAccuracy < 95 || dateSuccessRate < 90 ? 'REBUILD' : 'MINOR_FIXES'
    }
  }
}

// Run the comprehensive audit
comprehensiveDataAudit()
  .catch(error => {
    console.error('❌ Comprehensive audit failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })