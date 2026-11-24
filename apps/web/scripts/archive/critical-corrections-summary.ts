#!/usr/bin/env tsx

/**
 * CRITICAL CORRECTIONS VALIDATION SUMMARY
 * Focused validation of the 3 critical discrepancy fixes that were applied
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateCriticalCorrections() {
  console.log('🎯 CRITICAL SCORING CORRECTIONS VALIDATION')
  console.log('=' * 80)
  console.log('Validating the 3 critical discrepancy fixes applied to Tournament 28\n')

  try {
    // Get tournament and API data
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Tournament 28 not found')
    }

    let response
    let apiData
    try {
      response = await fetch('http://localhost:3000/api/tournaments/1/ranking')
      apiData = await response.json()
    } catch (error) {
      console.log('⚠️ Could not fetch API data, proceeding with database validation only')
    }

    console.log('📋 CRITICAL CORRECTIONS STATUS:')
    console.log('-' * 60)

    let allCorrect = true

    // CRITICAL FIX 1: Date 2, Position 6 - Jose Luis Toral instead of Juan Antonio Cortez
    console.log('\n1️⃣ DATE 2, POSITION 6: Jose Luis Toral (instead of Juan Antonio Cortez)')
    
    const fecha2Elimination = await prisma.elimination.findFirst({
      where: {
        gameDate: {
          tournamentId: tournament.id,
          dateNumber: 2
        },
        position: 6
      },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      }
    })

    if (fecha2Elimination) {
      const playerName = `${fecha2Elimination.eliminatedPlayer.firstName} ${fecha2Elimination.eliminatedPlayer.lastName}`
      
      if (playerName.includes('Jose Luis') && playerName.includes('Toral')) {
        console.log('   ✅ STATUS: CORRECT')
        console.log(`   👤 Player: ${playerName}`)
        console.log(`   🏆 Points: ${fecha2Elimination.points}`)
        
        // Verify in API
        if (apiData) {
          const joseLuisAPI = apiData.rankings.find((p: any) => 
            p.playerName.includes('Jose Luis') && p.playerName.includes('Toral')
          )
          if (joseLuisAPI) {
            console.log(`   📊 Date 2 API Points: ${joseLuisAPI.pointsByDate?.['2'] || 'N/A'}`)
            console.log(`   📈 Overall Ranking: Position ${joseLuisAPI.position} (${joseLuisAPI.totalPoints} total points)`)
          }
        }
      } else {
        console.log('   ❌ STATUS: INCORRECT')
        console.log(`   👤 Found: ${playerName} (Expected: Jose Luis Toral)`)
        allCorrect = false
      }
    } else {
      console.log('   ❌ STATUS: NOT FOUND')
      allCorrect = false
    }

    // CRITICAL FIX 2: Date 8, Position 2 - Fernando Peña instead of Miguel Chiesa
    console.log('\n2️⃣ DATE 8, POSITION 2: Fernando Peña (instead of Miguel Chiesa)')
    
    const fecha8Elimination = await prisma.elimination.findFirst({
      where: {
        gameDate: {
          tournamentId: tournament.id,
          dateNumber: 8
        },
        position: 2
      },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      }
    })

    if (fecha8Elimination) {
      const playerName = `${fecha8Elimination.eliminatedPlayer.firstName} ${fecha8Elimination.eliminatedPlayer.lastName}`
      
      if (playerName.includes('Fernando') && playerName.includes('Peña')) {
        console.log('   ✅ STATUS: CORRECT')
        console.log(`   👤 Player: ${playerName}`)
        console.log(`   🏆 Points: ${fecha8Elimination.points}`)
        
        // Verify in API
        if (apiData) {
          const fernandoAPI = apiData.rankings.find((p: any) => 
            p.playerName.includes('Fernando') && p.playerName.includes('Peña')
          )
          if (fernandoAPI) {
            console.log(`   📊 Date 8 API Points: ${fernandoAPI.pointsByDate?.['8'] || 'N/A'}`)
            console.log(`   📈 Overall Ranking: Position ${fernandoAPI.position} (${fernandoAPI.totalPoints} total points)`)
          }
        }
      } else {
        console.log('   ❌ STATUS: INCORRECT')
        console.log(`   👤 Found: ${playerName} (Expected: Fernando Peña)`)
        allCorrect = false
      }
    } else {
      console.log('   ❌ STATUS: NOT FOUND')
      allCorrect = false
    }

    // CRITICAL FIX 3: Date 8, Position 23 - Milton Tapia confirmed
    console.log('\n3️⃣ DATE 8, POSITION 23: Milton Tapia confirmed')
    
    const fecha8Milton = await prisma.elimination.findFirst({
      where: {
        gameDate: {
          tournamentId: tournament.id,
          dateNumber: 8
        },
        position: 23
      },
      include: {
        eliminatedPlayer: true,
        eliminatorPlayer: true
      }
    })

    if (fecha8Milton) {
      const playerName = `${fecha8Milton.eliminatedPlayer.firstName} ${fecha8Milton.eliminatedPlayer.lastName}`
      const eliminatorName = fecha8Milton.eliminatorPlayer ? 
        `${fecha8Milton.eliminatorPlayer.firstName} ${fecha8Milton.eliminatorPlayer.lastName}` : 'None'
      
      if (playerName.includes('Milton') && playerName.includes('Tapia')) {
        console.log('   ✅ STATUS: CORRECT')
        console.log(`   👤 Player: ${playerName}`)
        console.log(`   🎯 Eliminated by: ${eliminatorName}`)
        console.log(`   🏆 Points: ${fecha8Milton.points}`)
        
        // Verify in API
        if (apiData) {
          const miltonAPI = apiData.rankings.find((p: any) => 
            p.playerName.includes('Milton') && p.playerName.includes('Tapia')
          )
          if (miltonAPI) {
            console.log(`   📊 Date 8 API Points: ${miltonAPI.pointsByDate?.['8'] || 'N/A'}`)
            console.log(`   📈 Overall Ranking: Position ${miltonAPI.position} (${miltonAPI.totalPoints} total points)`)
          }
        }
      } else {
        console.log('   ❌ STATUS: INCORRECT')
        console.log(`   👤 Found: ${playerName} (Expected: Milton Tapia)`)
        allCorrect = false
      }
    } else {
      console.log('   ❌ STATUS: NOT FOUND')
      allCorrect = false
    }

    // Overall assessment
    console.log('\n' + '=' * 80)
    console.log('🎯 OVERALL CRITICAL CORRECTIONS ASSESSMENT')
    console.log('=' * 80)

    if (allCorrect) {
      console.log('🎉 SUCCESS: All 3 critical corrections have been successfully applied!')
      console.log('✅ Jose Luis Toral is correctly positioned in Date 2, Position 6')
      console.log('✅ Fernando Peña is correctly positioned in Date 8, Position 2')  
      console.log('✅ Milton Tapia is confirmed in Date 8, Position 23')
      console.log('\n🚀 DATA INTEGRITY: The critical discrepancies have been fixed')
      console.log('📈 IMPACT: Tournament ranking calculations should now be accurate')
    } else {
      console.log('⚠️ ISSUES DETECTED: Some critical corrections may not have been applied correctly')
      console.log('🔧 ACTION REQUIRED: Review and re-apply fixes as needed')
    }

    // Additional system checks
    if (apiData) {
      console.log('\n📊 CURRENT TOURNAMENT STATE:')
      console.log(`🏆 Tournament: ${apiData.tournament.name} (${apiData.tournament.number})`)
      console.log(`📅 Completed Dates: ${apiData.tournament.completedDates}/${apiData.tournament.totalDates}`)
      console.log(`👥 Active Players: ${apiData.rankings.length}`)
      console.log(`⏰ Last Updated: ${new Date(apiData.lastUpdated).toLocaleString()}`)
    }

  } catch (error) {
    console.error('❌ Validation error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation
validateCriticalCorrections()
  .catch(console.error)