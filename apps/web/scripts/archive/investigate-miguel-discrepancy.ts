#!/usr/bin/env tsx

/**
 * Script to investigate Miguel Chiesa point discrepancy
 * Real total: 149, System total: 152 (+3 difference)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateMiguelDiscrepancy() {
  console.log('🔍 Investigating Miguel Chiesa point discrepancy...')
  
  // Get Miguel's player ID
  const miguel = await prisma.player.findFirst({
    where: {
      firstName: 'Miguel',
      lastName: 'Chiesa'
    }
  })
  
  if (!miguel) {
    console.error('❌ Miguel not found')
    return
  }
  
  console.log('✅ Found Miguel:', miguel.firstName, miguel.lastName, 'ID:', miguel.id)
  
  // Get all eliminations for Miguel in Tournament 28
  const eliminations = await prisma.elimination.findMany({
    where: {
      eliminatedPlayerId: miguel.id,
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
  
  console.log('\\n📊 Miguel\'s eliminations in Tournament 28:')
  
  let totalPointsFromEliminations = 0
  const pointsByDate: Record<number, number> = {}
  
  eliminations.forEach(elimination => {
    console.log(`Date ${elimination.gameDate.dateNumber}: Position ${elimination.position}, Points ${elimination.points}`)
    pointsByDate[elimination.gameDate.dateNumber] = elimination.points
    totalPointsFromEliminations += elimination.points
  })
  
  console.log('\\n📈 System vs Real comparison:')
  console.log('System total from eliminations:', totalPointsFromEliminations)
  console.log('System total from ranking API:', 152)
  console.log('Real total (from image):', 149)
  console.log('Difference:', totalPointsFromEliminations - 149)
  
  // Expected points by date based on image real data
  // Since we don't have the detailed breakdown by date from the image,
  // we need to check if there are dates where Miguel didn't play
  
  console.log('\\n🎯 Checking for missing dates or incorrect points...')
  
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
  
  console.log('\\n📅 Miguel\'s participation by date:')
  
  allDates.forEach(date => {
    const participated = date.playerIds.includes(miguel.id)
    const hasElimination = pointsByDate[date.dateNumber] !== undefined
    const points = pointsByDate[date.dateNumber] || 0
    
    console.log(`Date ${date.dateNumber}: Participated: ${participated}, Has elimination: ${hasElimination}, Points: ${points}`)
    
    if (participated && !hasElimination) {
      console.log(`  ⚠️  Miguel participated but no elimination found!`)
    }
    if (!participated && hasElimination) {
      console.log(`  ⚠️  Miguel has elimination but wasn't in player list!`)
    }
  })
  
  console.log('\\n🔍 Summary:')
  console.log('- Total dates with eliminations:', eliminations.length)
  console.log('- Points from eliminations:', totalPointsFromEliminations)
  console.log('- Expected total (real):', 149)
  console.log('- Difference to fix:', totalPointsFromEliminations - 149, 'points')
}

// Run the investigation
investigateMiguelDiscrepancy()
  .catch(error => {
    console.error('❌ Investigation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })