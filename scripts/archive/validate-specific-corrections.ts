#!/usr/bin/env tsx

/**
 * Quick validation of the 3 specific corrections applied
 * 1. Jose Luis Toral should be in Date 2, Position 6 (instead of Juan Antonio Cortez)
 * 2. Fernando Peña should be in Date 8, Position 2 (instead of Miguel Chiesa)  
 * 3. Milton Tapia should be confirmed in Date 8, Position 23
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateSpecificCorrections() {
  console.log('🔍 VALIDATING SPECIFIC SCORING CORRECTIONS')
  console.log('='.repeat(60))

  try {
    // Get tournament 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Tournament 28 not found')
    }

    console.log('✅ Tournament 28 found\n')

    // Check 1: Date 2, Position 6 - Should be Jose Luis Toral
    console.log('🔎 CHECK 1: Date 2, Position 6')
    const fecha2 = await prisma.gameDate.findFirst({
      where: {
        tournamentId: tournament.id,
        dateNumber: 2
      },
      include: {
        eliminations: {
          where: { position: 6 },
          include: {
            eliminatedPlayer: true,
            eliminatorPlayer: true
          }
        }
      }
    })

    if (fecha2?.eliminations[0]) {
      const elimination = fecha2.eliminations[0]
      const playerName = `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`
      console.log(`Position 6: ${playerName}`)
      
      if (playerName.includes('Jose Luis') && playerName.includes('Toral')) {
        console.log('✅ CORRECT: Jose Luis Toral is in Date 2, Position 6')
      } else {
        console.log(`❌ INCORRECT: Expected Jose Luis Toral, found ${playerName}`)
      }
    } else {
      console.log('❌ No elimination found at Date 2, Position 6')
    }

    // Check 2: Date 8, Position 2 - Should be Fernando Peña
    console.log('\n🔎 CHECK 2: Date 8, Position 2')
    const fecha8 = await prisma.gameDate.findFirst({
      where: {
        tournamentId: tournament.id,
        dateNumber: 8
      },
      include: {
        eliminations: {
          where: { position: 2 },
          include: {
            eliminatedPlayer: true,
            eliminatorPlayer: true
          }
        }
      }
    })

    if (fecha8?.eliminations[0]) {
      const elimination = fecha8.eliminations[0]
      const playerName = `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`
      console.log(`Position 2: ${playerName}`)
      
      if (playerName.includes('Fernando') && playerName.includes('Peña')) {
        console.log('✅ CORRECT: Fernando Peña is in Date 8, Position 2')
      } else {
        console.log(`❌ INCORRECT: Expected Fernando Peña, found ${playerName}`)
      }
    } else {
      console.log('❌ No elimination found at Date 8, Position 2')
    }

    // Check 3: Date 8, Position 23 - Should be Milton Tapia
    console.log('\n🔎 CHECK 3: Date 8, Position 23')
    const eliminationP23 = await prisma.elimination.findFirst({
      where: {
        gameDateId: fecha8?.id,
        position: 23
      },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      }
    })

    if (eliminationP23) {
      const playerName = `${eliminationP23.eliminatedPlayer.firstName} ${eliminationP23.eliminatedPlayer.lastName}`
      const eliminatorName = eliminationP23.eliminatorPlayer ? 
        `${eliminationP23.eliminatorPlayer.firstName} ${eliminationP23.eliminatorPlayer.lastName}` : 'None'
      
      console.log(`Position 23: ${playerName} (eliminated by ${eliminatorName})`)
      
      if (playerName.includes('Milton') && playerName.includes('Tapia')) {
        console.log('✅ CORRECT: Milton Tapia is confirmed in Date 8, Position 23')
      } else {
        console.log(`❌ INCORRECT: Expected Milton Tapia, found ${playerName}`)
      }
    } else {
      console.log('❌ No elimination found at Date 8, Position 23')
    }

    // Verify current API ranking for these players
    console.log('\n🌐 CHECKING CURRENT API RANKING:')
    try {
      const response = await fetch('http://localhost:3000/api/tournaments/1/ranking')
      const apiData = await response.json()
      
      const joseLuis = apiData.rankings.find((p: any) => p.playerName.includes('Jose Luis') && p.playerName.includes('Toral'))
      const fernando = apiData.rankings.find((p: any) => p.playerName.includes('Fernando') && p.playerName.includes('Peña'))
      const milton = apiData.rankings.find((p: any) => p.playerName.includes('Milton') && p.playerName.includes('Tapia'))

      console.log(`Jose Luis Toral - Position: ${joseLuis?.position || 'Not found'}, Points: ${joseLuis?.totalPoints || 'N/A'}`)
      console.log(`Fernando Peña - Position: ${fernando?.position || 'Not found'}, Points: ${fernando?.totalPoints || 'N/A'}`)
      console.log(`Milton Tapia - Position: ${milton?.position || 'Not found'}, Points: ${milton?.totalPoints || 'N/A'}`)

      // Check specific dates points
      if (joseLuis?.pointsByDate) {
        console.log(`Jose Luis Toral Date 2 points: ${joseLuis.pointsByDate['2'] || 'N/A'}`)
      }
      if (fernando?.pointsByDate) {
        console.log(`Fernando Peña Date 8 points: ${fernando.pointsByDate['8'] || 'N/A'}`)
      }
      if (milton?.pointsByDate) {
        console.log(`Milton Tapia Date 8 points: ${milton.pointsByDate['8'] || 'N/A'}`)
      }

    } catch (error) {
      console.log('⚠️ Could not fetch API ranking data:', error)
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎯 VALIDATION SUMMARY')
    console.log('='.repeat(60))
    console.log('This script validates the three specific corrections that were applied.')
    console.log('All corrections should now show as CORRECT if the fixes were successful.')

  } catch (error) {
    console.error('❌ Error during validation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation
validateSpecificCorrections()
  .catch(console.error)