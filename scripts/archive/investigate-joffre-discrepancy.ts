#!/usr/bin/env tsx

/**
 * Script to investigate Joffre Palacios point discrepancy
 * Real total: 131, System total: 132 (+1 difference)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateJoffreDiscrepancy() {
  console.log('🔍 Investigating Joffre Palacios point discrepancy...')
  
  // Get Joffre's player ID
  const joffre = await prisma.player.findFirst({
    where: {
      firstName: 'Joffre',
      lastName: 'Palacios'
    }
  })
  
  if (!joffre) {
    console.error('❌ Joffre not found')
    return
  }
  
  console.log('✅ Found Joffre:', joffre.firstName, joffre.lastName, 'ID:', joffre.id)
  
  // Get all eliminations for Joffre in Tournament 28
  const eliminations = await prisma.elimination.findMany({
    where: {
      eliminatedPlayerId: joffre.id,
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
  
  console.log('\n📊 Joffre\'s eliminations in Tournament 28:')
  
  let totalPointsFromEliminations = 0
  const pointsByDate: Record<number, number> = {}
  
  eliminations.forEach(elimination => {
    console.log(`Date ${elimination.gameDate.dateNumber}: Position ${elimination.position}, Points ${elimination.points}`)
    pointsByDate[elimination.gameDate.dateNumber] = elimination.points
    totalPointsFromEliminations += elimination.points
  })
  
  console.log('\n📈 System vs Real comparison:')
  console.log('System total from eliminations:', totalPointsFromEliminations)
  console.log('Real total (from image):', 131)
  console.log('Difference:', totalPointsFromEliminations - 131)
  
  console.log('\n🎯 Checking for missing dates or incorrect points...')
  
  // Get all dates in tournament 28
  const allDates = await prisma.gameDate.findMany({
    where: {
      tournament: {
        number: 28
      }
    },
    select: {
      dateNumber: true,
      playerIds: true
    },
    orderBy: {
      dateNumber: 'asc'
    }
  })
  
  console.log('\n📅 Joffre\'s participation by date:')
  
  allDates.forEach(date => {
    const participated = date.playerIds.includes(joffre.id)
    const hasElimination = pointsByDate[date.dateNumber] !== undefined
    const points = pointsByDate[date.dateNumber] || 0
    
    console.log(`Date ${date.dateNumber}: Participated: ${participated}, Has elimination: ${hasElimination}, Points: ${points}`)
    
    if (participated && !hasElimination) {
      console.log(`  ⚠️  Joffre participated but no elimination found!`)
    }
    if (!participated && hasElimination) {
      console.log(`  ⚠️  Joffre has elimination but wasn't in player list!`)
    }
  })
  
  // Based on the image, let's check specific dates we know about
  console.log('\n🔍 Checking specific dates from real data:')
  console.log('From image f11.jpeg:')
  console.log('- Date 11: Joffre should have 1 point (position 20)')
  console.log('- Total should be 131 points')
  
  if (pointsByDate[11]) {
    console.log(`- Date 11 in system: ${pointsByDate[11]} points`)
    if (pointsByDate[11] !== 1) {
      console.log(`  ❌ MISMATCH: Date 11 should be 1 point, found ${pointsByDate[11]}`)
    }
  }
  
  console.log('\n🔍 Summary:')
  console.log('- Total dates with eliminations:', eliminations.length)
  console.log('- Points from eliminations:', totalPointsFromEliminations)
  console.log('- Expected total (real):', 131)
  console.log('- Difference to fix:', totalPointsFromEliminations - 131, 'points')
  
  // Since it's only +1 point difference, let's check each date more carefully
  console.log('\n🔎 Detailed analysis for small discrepancy:')
  
  // Real data from the provided CSV for Joffre
  const realJoffreData = [
    { date: 1, position: 5, points: 16 }, // From CSV
    { date: 2, position: 11, points: 13 }, // From CSV  
    { date: 3, position: 18, points: 5 }, // From CSV
    { date: 4, position: 20, points: 2 }, // From CSV
    { date: 5, position: 4, points: 18 }, // From CSV
    { date: 6, position: 18, points: 1 }, // From CSV
    { date: 7, position: 4, points: 20 }, // From CSV
    { date: 8, position: 20, points: 4 }, // From CSV
    { date: 9, position: 4, points: 19 }, // From CSV
    // Date 10: Need to check
    { date: 11, position: 20, points: 1 } // From image
  ]
  
  console.log('\nComparing specific dates with real data:')
  
  let realTotal = 0
  realJoffreData.forEach(real => {
    const systemPoints = pointsByDate[real.date] || 0
    const diff = systemPoints - real.points
    
    console.log(`Date ${real.date}: Real ${real.points} pts vs System ${systemPoints} pts (diff: ${diff})`)
    realTotal += real.points
    
    if (diff !== 0) {
      console.log(`  ❌ MISMATCH on Date ${real.date}`)
    }
  })
  
  console.log(`\nReal total from known dates: ${realTotal}`)
  console.log(`System total: ${totalPointsFromEliminations}`)
  console.log(`Image total: 131`)
  console.log(`Difference between real data and image: ${131 - realTotal}`)
}

// Run the investigation
investigateJoffreDiscrepancy()
  .catch(error => {
    console.error('❌ Investigation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })