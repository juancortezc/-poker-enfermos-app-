#!/usr/bin/env node

/**
 * Debug script to check why FECHA button is still active
 */

import { prisma } from '../src/lib/prisma'

async function debugFechaButton() {
  console.log('🔍 Debugging FECHA button state\n')
  
  try {
    // 1. Check current game dates
    console.log('📊 Current game dates with CREATED or in_progress status:')
    const activeDates = await prisma.gameDate.findMany({
      where: {
        status: {
          in: ['CREATED', 'in_progress']
        }
      },
      include: {
        tournament: true
      },
      orderBy: { dateNumber: 'asc' }
    })
    
    if (activeDates.length === 0) {
      console.log('  ❌ No dates with CREATED or in_progress status found')
    } else {
      activeDates.forEach(date => {
        console.log(`  ✅ Date ${date.dateNumber} - Status: ${date.status} - Tournament: ${date.tournament.number}`)
        console.log(`     Players: ${date.playerIds.length}`)
        console.log(`     ID: ${date.id}`)
      })
    }
    
    // 2. Simulate the exact query from configured-or-active endpoint
    console.log('\n🔍 Simulating configured-or-active endpoint query:')
    const configuredOrActiveDate = await prisma.gameDate.findFirst({
      where: {
        status: {
          in: ['CREATED', 'in_progress']
        }
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        }
      },
      orderBy: [
        { status: 'desc' },
        { dateNumber: 'asc' }
      ]
    })
    
    if (configuredOrActiveDate) {
      console.log('  ✅ Found date:', {
        id: configuredOrActiveDate.id,
        dateNumber: configuredOrActiveDate.dateNumber,
        status: configuredOrActiveDate.status,
        playersCount: configuredOrActiveDate.playerIds.length,
        isConfigured: configuredOrActiveDate.status === 'CREATED',
        isInProgress: configuredOrActiveDate.status === 'in_progress'
      })
    } else {
      console.log('  ❌ No configured or active date found')
    }
    
    // 3. Check SWR cache behavior suggestion
    console.log('\n💡 Debugging suggestions:')
    console.log('  1. Clear browser cache and reload')
    console.log('  2. Check Network tab in DevTools for API calls')
    console.log('  3. Add console.log in Dashboard component:')
    console.log('     console.log("hasConfiguredOrActiveDate:", hasConfiguredOrActiveDate)')
    console.log('     console.log("configuredOrActiveDate:", configuredOrActiveDate)')
    console.log('  4. Check if SWR is caching old data')
    console.log('  5. Try manually calling mutate() on the hook')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  debugFechaButton()
}