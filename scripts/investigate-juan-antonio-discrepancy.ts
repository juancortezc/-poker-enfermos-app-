#!/usr/bin/env tsx

/**
 * Script to investigate Juan Antonio Cortez point discrepancy
 * Real total: 119, System total: 130 (+11 difference)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateJuanAntonioDiscrepancy() {
  console.log('🔍 Investigating Juan Antonio Cortez point discrepancy...')
  
  // Get Juan Antonio's player ID
  const juanAntonio = await prisma.player.findFirst({
    where: {
      firstName: 'Juan Antonio',
      lastName: 'Cortez'
    }
  })
  
  if (!juanAntonio) {
    console.error('❌ Juan Antonio not found')
    return
  }
  
  console.log('✅ Found Juan Antonio:', juanAntonio.firstName, juanAntonio.lastName, 'ID:', juanAntonio.id)
  
  // Get all eliminations for Juan Antonio in Tournament 28
  const eliminations = await prisma.elimination.findMany({
    where: {
      eliminatedPlayerId: juanAntonio.id,
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
  
  console.log('\n📊 Juan Antonio\'s eliminations in Tournament 28:')
  
  let totalPointsFromEliminations = 0
  const pointsByDate: Record<number, number> = {}
  
  eliminations.forEach(elimination => {
    console.log(`Date ${elimination.gameDate.dateNumber}: Position ${elimination.position}, Points ${elimination.points}`)
    pointsByDate[elimination.gameDate.dateNumber] = elimination.points
    totalPointsFromEliminations += elimination.points
  })
  
  console.log('\n📈 System vs Real comparison:')
  console.log('System total from eliminations:', totalPointsFromEliminations)
  console.log('Real total (from image):', 119)
  console.log('Difference:', totalPointsFromEliminations - 119)
  
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
  
  console.log('\n📅 Juan Antonio\'s participation by date:')
  
  allDates.forEach(date => {
    const participated = date.playerIds.includes(juanAntonio.id)
    const hasElimination = pointsByDate[date.dateNumber] !== undefined
    const points = pointsByDate[date.dateNumber] || 0
    
    console.log(`Date ${date.dateNumber}: Participated: ${participated}, Has elimination: ${hasElimination}, Points: ${points}`)
    
    if (participated && !hasElimination) {
      console.log(`  ⚠️  Juan Antonio participated but no elimination found!`)
    }
    if (!participated && hasElimination) {
      console.log(`  ⚠️  Juan Antonio has elimination but wasn't in player list!`)
    }
  })
  
  // Based on the image, let's check specific dates we know about
  console.log('\n🔍 Checking specific dates from real data:')
  console.log('From image f11.jpeg:')
  console.log('- Date 11: Juan Antonio should have 2 points (position 19)')
  console.log('- Total should be 119 points')
  
  if (pointsByDate[11]) {
    console.log(`- Date 11 in system: ${pointsByDate[11]} points`)
    if (pointsByDate[11] !== 2) {
      console.log(`  ❌ MISMATCH: Date 11 should be 2 points, found ${pointsByDate[11]}`)
    }
  }
  
  console.log('\n🔍 Summary:')
  console.log('- Total dates with eliminations:', eliminations.length)
  console.log('- Points from eliminations:', totalPointsFromEliminations)
  console.log('- Expected total (real):', 119)
  console.log('- Difference to fix:', totalPointsFromEliminations - 119, 'points')
  
  // Let's also check if he has any wins that might be auto-calculated incorrectly
  console.log('\n🏆 Checking for potential winner records:')
  
  // Check dates where Juan Antonio participated but wasn't eliminated
  for (const date of allDates) {
    if (date.playerIds.includes(juanAntonio.id) && !pointsByDate[date.dateNumber]) {
      console.log(`Date ${date.dateNumber}: Juan Antonio participated but no elimination - potential winner?`)
      
      // Check how many eliminations exist for this date
      const dateEliminations = await prisma.elimination.count({
        where: { gameDateId: date.dateNumber }
      })
      
      const totalPlayers = date.playerIds.length
      console.log(`  Players: ${totalPlayers}, Eliminations: ${dateEliminations}`)
      
      if (dateEliminations === totalPlayers - 1) {
        console.log(`  🏆 Juan Antonio likely won Date ${date.dateNumber} (auto-calculated points)`)
      }
    }
  }
}

// Run the investigation
investigateJuanAntonioDiscrepancy()
  .catch(error => {
    console.error('❌ Investigation failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })