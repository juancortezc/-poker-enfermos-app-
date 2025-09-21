#!/usr/bin/env npx tsx

/**
 * Test script to debug why FECHA button is not disabled
 * Simulates the exact flow the Dashboard component follows
 */

import { fetcher } from '../src/lib/swr-config'

async function testFechaButtonBehavior() {
  console.log('🔍 Testing FECHA Button Behavior\n')

  try {
    // Step 1: Test API endpoint that hook uses
    console.log('1️⃣ Testing API endpoint...')
    const endpoint = '/api/game-dates/configured-or-active'
    console.log(`   Endpoint: ${endpoint}`)
    
    const response = await fetch(`http://localhost:3001${endpoint}`)
    const data = await response.json()
    
    console.log('📊 API Response:')
    console.log(`   Status: ${response.status}`)
    console.log(`   Data:`, JSON.stringify(data, null, 2))
    
    // Step 2: Simulate hook logic
    console.log('\n2️⃣ Simulating useConfiguredOrActiveGameDate hook...')
    const hasConfiguredOrActiveDate = !!data
    const isConfigured = data?.isConfigured || false
    const isInProgress = data?.isInProgress || false
    
    console.log('🎯 Hook computed values:')
    console.log(`   hasConfiguredOrActiveDate: ${hasConfiguredOrActiveDate}`)
    console.log(`   isConfigured: ${isConfigured}`)
    console.log(`   isInProgress: ${isInProgress}`)
    console.log(`   gameDate status: ${data?.status || 'null'}`)
    
    // Step 3: Simulate Dashboard button logic
    console.log('\n3️⃣ Simulating Dashboard button logic...')
    const quickActions = [
      {
        title: 'FECHA',
        href: '/game-dates/config',
        disabled: hasConfiguredOrActiveDate, // This is the key logic
        adminOnly: true,
      }
    ]
    
    const fechaAction = quickActions[0]
    const isDisabled = fechaAction.disabled
    
    console.log('🎛️ Button state:')
    console.log(`   disabled: ${isDisabled}`)
    console.log(`   Should be grayed out: ${isDisabled}`)
    console.log(`   Should prevent navigation: ${isDisabled}`)
    
    // Step 4: Analysis
    console.log('\n4️⃣ Analysis...')
    if (data && data.status === 'CREATED') {
      if (isDisabled) {
        console.log('✅ CORRECT: Button is disabled because there is a CREATED date')
        console.log('   The logic is working as expected.')
        console.log('   Issue might be:')
        console.log('   - Browser cache not reflecting the disabled state')
        console.log('   - CSS not applying disabled styles correctly')
        console.log('   - React not re-rendering with updated state')
      } else {
        console.log('❌ PROBLEM: Button should be disabled but is not')
        console.log('   hasConfiguredOrActiveDate should be true but is:', hasConfiguredOrActiveDate)
      }
    } else if (!data) {
      console.log('❌ PROBLEM: No CREATED date found in database')
      console.log('   The date might not actually be in CREATED status')
    }
    
    // Step 5: CSS/UI verification
    console.log('\n5️⃣ Expected UI behavior:')
    if (isDisabled) {
      console.log('📱 Button should show:')
      console.log('   - Card opacity: 60% (opacity-60 class)')
      console.log('   - Icon background: bg-gray-700/50 (gray instead of red)')
      console.log('   - Icon color: text-gray-500 (gray instead of white)')
      console.log('   - No hover effects (no cursor-pointer, no hover:scale-105)')
      console.log('   - No click navigation (wrapped in div instead of Link)')
    }
    
    console.log('\n💡 Next steps:')
    console.log('   1. Check browser DevTools to see if these CSS classes are applied')
    console.log('   2. Verify SWR is not using cached data')
    console.log('   3. Check if React is re-rendering with correct state')
    console.log('   4. Look for console logs in Dashboard component')
    
  } catch (error) {
    console.error('❌ Error during test:', error)
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testFechaButtonBehavior()
}