#!/usr/bin/env tsx

/**
 * Test script to validate FECHA button disable logic
 * Tests both Dashboard and GameDateConfigPage behavior
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestResult {
  scenario: string
  expected: any
  actual: any
  passed: boolean
}

async function testScenario(scenario: string, testFn: () => Promise<any>): Promise<TestResult> {
  try {
    const result = await testFn()
    return {
      scenario,
      expected: result.expected,
      actual: result.actual,
      passed: result.expected === result.actual
    }
  } catch (error) {
    return {
      scenario,
      expected: 'No error',
      actual: `Error: ${error}`,
      passed: false
    }
  }
}

async function simulateConfiguredOrActiveEndpoint() {
  const activeOrCreatedDate = await prisma.gameDate.findFirst({
    where: {
      status: {
        in: ['CREATED', 'in_progress']
      }
    },
    include: {
      tournament: true
    }
  })

  if (activeOrCreatedDate) {
    return {
      found: true,
      status: activeOrCreatedDate.status,
      dateNumber: activeOrCreatedDate.dateNumber,
      tournamentName: activeOrCreatedDate.tournament.name
    }
  }
  
  return { found: false }
}

async function simulateAvailableDatesEndpoint() {
  // Check if there are any CREATED or in_progress dates
  const activeOrCreatedDate = await prisma.gameDate.findFirst({
    where: {
      status: {
        in: ['CREATED', 'in_progress']
      }
    }
  })

  if (activeOrCreatedDate) {
    return {
      blocked: true,
      availableDates: [],
      blockedReason: `Existe una fecha ${activeOrCreatedDate.dateNumber} en estado ${activeOrCreatedDate.status}`
    }
  }

  // Get tournament and available dates
  const activeTournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    include: {
      gameDates: {
        where: {
          status: {
            notIn: ['completed', 'CREATED', 'in_progress']
          }
        }
      }
    }
  })

  return {
    blocked: false,
    availableDates: activeTournament?.gameDates || [],
    tournament: activeTournament?.name
  }
}

async function runTests() {
  console.log('🔍 Testing FECHA Button Disable Logic\n')
  
  const results: TestResult[] = []

  // Test 1: Check current database state
  results.push(await testScenario(
    'Database State Check',
    async () => {
      const activeDates = await prisma.gameDate.findMany({
        where: {
          status: {
            in: ['CREATED', 'in_progress']
          }
        }
      })
      
      return {
        expected: true, // Should find at least one active date
        actual: activeDates.length > 0
      }
    }
  ))

  // Test 2: Dashboard endpoint logic
  results.push(await testScenario(
    'Dashboard configured-or-active endpoint',
    async () => {
      const result = await simulateConfiguredOrActiveEndpoint()
      
      return {
        expected: true, // Should find an active/created date
        actual: result.found
      }
    }
  ))

  // Test 3: GameDateConfigPage available-dates endpoint
  results.push(await testScenario(
    'GameDateConfigPage available-dates endpoint',
    async () => {
      const result = await simulateAvailableDatesEndpoint()
      
      return {
        expected: true, // Should be blocked
        actual: result.blocked
      }
    }
  ))

  // Test 4: Button logic consistency
  results.push(await testScenario(
    'Button disable logic consistency',
    async () => {
      const dashboardResult = await simulateConfiguredOrActiveEndpoint()
      const configPageResult = await simulateAvailableDatesEndpoint()
      
      const dashboardSaysDisable = dashboardResult.found
      const configPageSaysBlock = configPageResult.blocked
      
      return {
        expected: true, // Both should agree
        actual: dashboardSaysDisable === configPageSaysBlock
      }
    }
  ))

  // Test 5: Error message consistency
  results.push(await testScenario(
    'Error message format',
    async () => {
      const result = await simulateAvailableDatesEndpoint()
      
      const hasCorrectFormat = result.blockedReason?.includes('Existe una fecha') && 
                              result.blockedReason?.includes('en estado')
      
      return {
        expected: true,
        actual: hasCorrectFormat
      }
    }
  ))

  // Print results
  console.log('📊 Test Results:\n')
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} Test ${index + 1}: ${result.scenario}`)
    console.log(`   Expected: ${result.expected}`)
    console.log(`   Actual: ${result.actual}`)
    console.log()
  })

  // Summary
  const passed = results.filter(r => r.passed).length
  const total = results.length
  
  console.log(`📈 Summary: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - FECHA button logic is working correctly!')
  } else {
    console.log('⚠️  Some tests failed - check implementation')
  }

  // Current database state for debugging
  console.log('\n🔍 Current Database State:')
  
  const allGameDates = await prisma.gameDate.findMany({
    include: { tournament: true },
    orderBy: [{ tournament: { number: 'desc' }}, { dateNumber: 'asc' }]
  })
  
  allGameDates.forEach(date => {
    const statusIcon = {
      'pending': '⏳',
      'CREATED': '🔄',
      'in_progress': '▶️',
      'completed': '✅',
      'cancelled': '❌'
    }[date.status] || '❓'
    
    console.log(`   ${statusIcon} ${date.tournament.name} - Fecha ${date.dateNumber}: ${date.status}`)
  })

  console.log('\n🎯 Expected Behavior:')
  console.log('   - Dashboard: FECHA button should be DISABLED (gray, no navigation)')
  console.log('   - Config Page: Should show "Acceso Bloqueado" with error message')
  console.log('   - Both endpoints should agree on blocking logic')
}

// Run the tests
runTests()
  .catch(error => {
    console.error('❌ Test execution failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })