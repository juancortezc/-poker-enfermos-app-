#!/usr/bin/env tsx

/**
 * Direct database investigation of ranking calculation issues
 * Focus on understanding why API totals differ from manual elimination sums
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateRankingCalculation() {
  console.log('🔍 Direct database investigation of ranking calculation...')
  
  const problemPlayers = ['Daniel Vela', 'Jorge Tamayo']
  
  for (const playerName of problemPlayers) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔍 INVESTIGATING: ${playerName}`)
    console.log(`${'='.repeat(80)}`)
    
    // Find player
    const nameParts = playerName.split(' ')
    const player = await prisma.player.findFirst({
      where: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ')
      }
    })
    
    if (!player) {
      console.log(`❌ Player ${playerName} not found`)
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
            id: true,
            dateNumber: true,
            status: true,
            playerIds: true
          }
        }
      },
      orderBy: {
        gameDate: {
          dateNumber: 'asc'
        }
      }
    })
    
    console.log(`\n📊 Eliminations found: ${eliminations.length}`)
    
    let manualTotal = 0
    const datePoints = {}
    
    console.log('\nDate-by-date eliminations:')
    eliminations.forEach(elim => {
      console.log(`Date ${elim.gameDate.dateNumber}: ${elim.points} pts (Position ${elim.position})`)
      manualTotal += elim.points
      datePoints[elim.gameDate.dateNumber] = elim.points
    })
    
    console.log(`Manual total from eliminations: ${manualTotal}`)
    
    // Check for dates where player participated but no elimination (potential winners)
    console.log('\n🏆 Checking for winner dates (participated but no elimination):')
    
    const allDates = await prisma.gameDate.findMany({
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
    
    let winnerBonusPoints = 0
    
    for (const gameDate of allDates) {
      const participated = gameDate.playerIds.includes(player.id)
      const hasElimination = eliminations.find(e => e.gameDate.dateNumber === gameDate.dateNumber)
      
      if (participated && !hasElimination) {
        console.log(`Date ${gameDate.dateNumber}: Participated but no elimination`)
        
        // Count eliminations for this date
        const eliminationCount = await prisma.elimination.count({
          where: { gameDateId: gameDate.id }
        })
        
        const totalPlayers = gameDate.playerIds.length
        console.log(`  Players: ${totalPlayers}, Eliminations: ${eliminationCount}`)
        
        if (eliminationCount === totalPlayers - 1) {
          console.log(`  🏆 WINNER DETECTED! ${playerName} won Date ${gameDate.dateNumber}`)
          
          // Calculate winner points using standard formula
          // Find the second place elimination to calculate winner points
          const secondPlace = await prisma.elimination.findFirst({
            where: {
              gameDateId: gameDate.id,
              position: 2
            }
          })
          
          let winnerPoints = 0
          if (secondPlace) {
            winnerPoints = secondPlace.points + 3  // Winner gets 2nd place + 3
            console.log(`  Winner points (2nd place + 3): ${secondPlace.points} + 3 = ${winnerPoints}`)
          } else {
            // Fallback: calculate based on total players
            winnerPoints = totalPlayers // Standard calculation
            console.log(`  Winner points (fallback): ${winnerPoints}`)
          }
          
          winnerBonusPoints += winnerPoints
          datePoints[gameDate.dateNumber] = winnerPoints
        } else if (eliminationCount < totalPlayers - 1) {
          console.log(`  ⚠️  Date still in progress or incomplete data`)
        }
      }
    }
    
    const totalWithWinners = manualTotal + winnerBonusPoints
    
    console.log('\n📊 CALCULATION SUMMARY:')
    console.log(`Manual elimination total: ${manualTotal}`)
    console.log(`Winner bonus points: ${winnerBonusPoints}`)
    console.log(`Expected total: ${totalWithWinners}`)
    
    // Show all dates with points
    console.log('\n📅 Complete points breakdown:')
    for (let date = 1; date <= 12; date++) {
      const points = datePoints[date] || 0
      const participated = allDates.find(d => d.dateNumber === date)?.playerIds.includes(player.id)
      const status = participated ? (points > 0 ? '✅' : '⚠️ ') : '❌'
      console.log(`Date ${date}: ${points.toString().padStart(2)} pts ${status}`)
    }
  }
  
  // Also check Juan Fernando Ochoa name issue
  console.log('\n' + '='.repeat(80))
  console.log('🔍 INVESTIGATING: Juan Fernando Ochoa name issue')
  console.log('='.repeat(80))
  
  // Try different name variations
  const nameVariations = [
    ['Juan Fernando', 'Ochoa'],
    ['Juan Fernando ', 'Ochoa'],  // Extra space
    ['Juan Fernando', ' Ochoa'],  // Space at start
    ['Juan Fernando ', ' Ochoa'], // Both spaces
    ['Juan Fernando', 'Ochoa '],  // Space at end
    ['Juan Fernando  ', 'Ochoa']  // Double space
  ]
  
  for (const [firstName, lastName] of nameVariations) {
    const player = await prisma.player.findFirst({
      where: {
        firstName: firstName,
        lastName: lastName
      }
    })
    
    if (player) {
      console.log(`✅ Found: "${firstName}" + "${lastName}" = ${player.firstName} ${player.lastName}`)
      
      // Get their eliminations
      const eliminations = await prisma.elimination.findMany({
        where: {
          eliminatedPlayerId: player.id,
          gameDate: {
            tournament: { number: 28 }
          }
        }
      })
      
      const total = eliminations.reduce((sum, e) => sum + e.points, 0)
      console.log(`   Total points: ${total}`)
      break
    }
  }
}

// Run the investigation
investigateRankingCalculation()
  .catch(error => {
    console.error('❌ Investigation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })