#!/usr/bin/env tsx

/**
 * Investigation of API vs Manual calculation discrepancies
 * Focus on Daniel Vela and Jorge Tamayo who have major differences
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateDiscrepancies() {
  console.log('🔍 Investigating API vs Manual calculation discrepancies...')
  
  // Problem players
  const problemPlayers = [
    { name: 'Daniel Vela', apiTotal: 159, manualTotal: 129 },
    { name: 'Jorge Tamayo', apiTotal: 145, manualTotal: 115 }
  ]
  
  for (const problemPlayer of problemPlayers) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔍 INVESTIGATING: ${problemPlayer.name}`)
    console.log(`API Total: ${problemPlayer.apiTotal} | Manual Total: ${problemPlayer.manualTotal} | Difference: ${problemPlayer.apiTotal - problemPlayer.manualTotal}`)
    console.log(`${'='.repeat(80)}`)
    
    // Find player
    const nameParts = problemPlayer.name.split(' ')
    const player = await prisma.player.findFirst({
      where: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ')
      }
    })
    
    if (!player) {
      console.log(`❌ Player ${problemPlayer.name} not found`)
      continue
    }
    
    console.log(`✅ Found player: ${player.firstName} ${player.lastName} (ID: ${player.id})`)
    
    // Get API data
    const response = await fetch('http://localhost:3002/api/tournaments/1/ranking')
    const apiData = await response.json()
    const apiPlayer = apiData.rankings.find(p => p.playerName === `${player.firstName} ${player.lastName}`)
    
    if (!apiPlayer) {
      console.log(`❌ Player not found in API ranking`)
      continue
    }
    
    console.log('\n📊 API vs Manual Comparison:')
    console.log(`API Total Points: ${apiPlayer.totalPoints}`)
    console.log(`API Final Score: ${apiPlayer.finalScore}`)
    console.log(`API Dates Played: ${apiPlayer.datesPlayed}`)
    
    // Get all eliminations manually
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
    
    console.log(`\nManual calculation from eliminations:`)
    console.log(`Total eliminations found: ${eliminations.length}`)
    
    let manualTotal = 0
    console.log('\nDetailed breakdown:')
    eliminations.forEach(elim => {
      console.log(`Date ${elim.gameDate.dateNumber}: ${elim.points} pts (Position ${elim.position}, Status: ${elim.gameDate.status})`)
      manualTotal += elim.points
    })
    
    console.log(`Manual total: ${manualTotal}`)
    
    // Check API points by date
    console.log('\n📅 API Points by Date:')
    const apiPointsByDate = apiPlayer.pointsByDate || {}
    let apiCalculatedTotal = 0
    
    for (let date = 1; date <= 12; date++) {
      const apiPoints = apiPointsByDate[date] || 0
      const elimination = eliminations.find(e => e.gameDate.dateNumber === date)
      const elimPoints = elimination ? elimination.points : 0
      
      console.log(`Date ${date}: API=${apiPoints} pts | Manual=${elimPoints} pts | Match: ${apiPoints === elimPoints ? '✅' : '❌'}`)
      apiCalculatedTotal += apiPoints
    }
    
    console.log(`\nAPI calculated total from pointsByDate: ${apiCalculatedTotal}`)
    console.log(`API totalPoints field: ${apiPlayer.totalPoints}`)
    console.log(`Manual sum of eliminations: ${manualTotal}`)
    
    // Check for potential issues
    console.log('\n🔍 Potential Issues:')
    
    if (apiPlayer.totalPoints !== apiCalculatedTotal) {
      console.log(`❌ API totalPoints (${apiPlayer.totalPoints}) ≠ API pointsByDate sum (${apiCalculatedTotal})`)
    }
    
    if (apiCalculatedTotal !== manualTotal) {
      console.log(`❌ API pointsByDate sum (${apiCalculatedTotal}) ≠ Manual eliminations sum (${manualTotal})`)
    }
    
    // Check for winner bonuses or special calculations
    console.log('\n🏆 Checking for winner bonuses or missing eliminations:')
    
    // Check if player won any dates (no elimination record but participated)
    const allGameDates = await prisma.gameDate.findMany({
      where: {
        tournament: { number: 28 },
        status: { in: ['completed', 'in_progress'] }
      },
      select: {
        id: true,
        dateNumber: true,
        playerIds: true
      },
      orderBy: { dateNumber: 'asc' }
    })
    
    for (const gameDate of allGameDates) {
      const participated = gameDate.playerIds.includes(player.id)
      const hasElimination = eliminations.find(e => e.gameDate.dateNumber === gameDate.dateNumber)
      
      if (participated && !hasElimination) {
        console.log(`🏆 Date ${gameDate.dateNumber}: Participated but no elimination (potential winner)`)
        
        // Check if they're the only one without elimination (winner)
        const dateEliminations = await prisma.elimination.count({
          where: { gameDateId: gameDate.id }
        })
        
        const totalPlayers = gameDate.playerIds.length
        
        if (dateEliminations === totalPlayers - 1) {
          console.log(`   └── Likely winner: ${totalPlayers} players, ${dateEliminations} eliminations`)
          
          // This could explain the discrepancy - winner points not in elimination table
          const winnerPoints = apiPointsByDate[gameDate.dateNumber] || 0
          if (winnerPoints > 0) {
            console.log(`   └── Winner points from API: ${winnerPoints}`)
          }
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('🎯 INVESTIGATION SUMMARY:')
  console.log('The discrepancies appear to be caused by:')
  console.log('1. Winner points not stored in elimination records')
  console.log('2. API calculating winner points differently than manual sum')
  console.log('3. Potential double-counting or bonus points in API')
  console.log('='.repeat(80))
}

// Run the investigation
investigateDiscrepancies()
  .catch(error => {
    console.error('❌ Investigation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })