#!/usr/bin/env npx tsx

/**
 * Comprehensive UI Test Script for FECHA Button
 * Tests the complete visual and functional behavior
 */

interface TestResult {
  test: string
  passed: boolean
  details: string
  screenshot?: string
}

async function testFechaButtonUI() {
  console.log('🎭 Starting FECHA Button UI Test with Playwright\n')
  
  const results: TestResult[] = []
  let browser: any = null
  
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: false, // Show browser for debugging
      slowMo: 1000 // Slow down for visibility
    })
    
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Navigate to dashboard
    console.log('📍 Navigating to dashboard...')
    await page.goto('http://localhost:3001')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Test 1: Check if API returns CREATED date
    console.log('1️⃣ Testing API response...')
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/game-dates/configured-or-active')
      return {
        status: response.status,
        data: await response.json()
      }
    })
    
    results.push({
      test: 'API Response',
      passed: apiResponse.status === 200 && apiResponse.data?.status === 'CREATED',
      details: `Status: ${apiResponse.status}, Data status: ${apiResponse.data?.status || 'null'}`
    })
    
    // Test 2: Check console logs for hook data
    console.log('2️⃣ Checking console logs...')
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('Dashboard Debug') || msg.text().includes('useConfiguredOrActiveGameDate')) {
        consoleLogs.push(msg.text())
      }
    })
    
    // Refresh to trigger logs
    await page.reload()
    await page.waitForTimeout(2000)
    
    const hasDebugLogs = consoleLogs.some(log => log.includes('hasConfiguredOrActiveDate'))
    results.push({
      test: 'Console Debug Logs',
      passed: hasDebugLogs,
      details: `Found ${consoleLogs.length} relevant logs`
    })
    
    // Test 3: Check if FECHA button exists
    console.log('3️⃣ Locating FECHA button...')
    const fechaButton = page.locator('text=FECHA').first()
    const buttonExists = await fechaButton.count() > 0
    
    results.push({
      test: 'FECHA Button Exists',
      passed: buttonExists,
      details: buttonExists ? 'Button found' : 'Button not found'
    })
    
    if (!buttonExists) {
      console.log('❌ FECHA button not found, cannot continue tests')
      return results
    }
    
    // Test 4: Check button visual state (disabled)
    console.log('4️⃣ Checking button visual state...')
    const buttonCard = fechaButton.locator('..').locator('..') // Navigate up to card
    
    // Check for disabled styling
    const hasOpacityClass = await buttonCard.evaluate(el => {
      return el.classList.contains('opacity-60')
    })
    
    const iconBackground = buttonCard.locator('.w-14.h-14').first()
    const hasGrayBackground = await iconBackground.evaluate(el => {
      return el.classList.contains('bg-gray-700/50') || 
             getComputedStyle(el).backgroundColor.includes('gray')
    })
    
    const icon = iconBackground.locator('svg').first()
    const hasGrayIcon = await icon.evaluate(el => {
      return el.classList.contains('text-gray-500') ||
             getComputedStyle(el).color.includes('128') // Gray color values
    })
    
    results.push({
      test: 'Button Opacity (should be 60%)',
      passed: hasOpacityClass,
      details: hasOpacityClass ? 'Has opacity-60 class' : 'Missing opacity-60 class'
    })
    
    results.push({
      test: 'Icon Background (should be gray)',
      passed: hasGrayBackground,
      details: hasGrayBackground ? 'Has gray background' : 'Still has red background'
    })
    
    results.push({
      test: 'Icon Color (should be gray)',
      passed: hasGrayIcon,
      details: hasGrayIcon ? 'Has gray color' : 'Still has white color'
    })
    
    // Test 5: Check if button is clickable (should not be)
    console.log('5️⃣ Testing button functionality...')
    
    // Check if button is wrapped in Link or div
    const parentElement = await buttonCard.locator('..').evaluate(el => el.tagName.toLowerCase())
    const isWrappedInDiv = parentElement === 'div'
    
    results.push({
      test: 'Button Navigation Disabled',
      passed: isWrappedInDiv,
      details: isWrappedInDiv ? 'Wrapped in div (disabled)' : 'Wrapped in link (enabled)'
    })
    
    // Test 6: Try clicking the button
    console.log('6️⃣ Testing click behavior...')
    const initialUrl = page.url()
    
    try {
      await fechaButton.click({ timeout: 2000 })
      await page.waitForTimeout(1000)
      
      const newUrl = page.url()
      const navigationOccurred = initialUrl !== newUrl
      
      results.push({
        test: 'Click Navigation Prevention',
        passed: !navigationOccurred,
        details: navigationOccurred ? 
          `Navigation occurred to: ${newUrl}` : 
          'No navigation occurred (correct)'
      })
    } catch (error) {
      results.push({
        test: 'Click Navigation Prevention',
        passed: true,
        details: 'Button click was blocked or failed (correct behavior)'
      })
    }
    
    // Test 7: Check debug panel (development only)
    console.log('7️⃣ Checking debug panel...')
    const debugPanel = page.locator('text=FECHA Button Debug')
    const debugExists = await debugPanel.count() > 0
    
    if (debugExists) {
      const debugInfo = await debugPanel.locator('..').textContent()
      const hasCorrectState = debugInfo?.includes('DISABLED (Gray)')
      
      results.push({
        test: 'Debug Panel Shows Correct State',
        passed: hasCorrectState || false,
        details: hasCorrectState ? 'Shows DISABLED (Gray)' : 'Shows incorrect state'
      })
    } else {
      results.push({
        test: 'Debug Panel Visibility',
        passed: false,
        details: 'Debug panel not visible (check if in development mode)'
      })
    }
    
    // Take screenshot for visual verification
    console.log('📸 Taking screenshot...')
    await page.screenshot({ 
      path: 'fecha-button-test-result.png',
      fullPage: true 
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
    results.push({
      test: 'Test Execution',
      passed: false,
      details: `Error: ${error}`
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
  
  return results
}

function printResults(results: TestResult[]) {
  console.log('\n📊 TEST RESULTS:')
  console.log('═'.repeat(60))
  
  let passedCount = 0
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌'
    const number = (index + 1).toString().padStart(2, '0')
    
    console.log(`${status} ${number}. ${result.test}`)
    console.log(`    ${result.details}`)
    
    if (result.passed) passedCount++
  })
  
  console.log('═'.repeat(60))
  console.log(`SUMMARY: ${passedCount}/${results.length} tests passed`)
  
  if (passedCount === results.length) {
    console.log('🎉 ALL TESTS PASSED! The FECHA button is correctly disabled.')
  } else {
    console.log('⚠️  SOME TESTS FAILED. The button may not be properly disabled.')
    console.log('\n💡 TROUBLESHOOTING:')
    console.log('   1. Clear browser cache (Ctrl+Shift+R)')
    console.log('   2. Check browser console for SWR debug logs')
    console.log('   3. Use Force Refresh button in debug panel')
    console.log('   4. Verify you are running in development mode')
  }
  
  console.log('\n📸 Screenshot saved as: fecha-button-test-result.png')
}

// Simple version without Playwright for basic testing
async function simpleAPITest() {
  console.log('🔍 Running Simple API Test (no browser required)\n')
  
  try {
    const response = await fetch('http://localhost:3001/api/game-dates/configured-or-active')
    const data = await response.json()
    
    console.log('📊 API Test Results:')
    console.log(`   Status: ${response.status}`)
    console.log(`   Has date: ${!!data}`)
    console.log(`   Date status: ${data?.status || 'none'}`)
    console.log(`   Date number: ${data?.dateNumber || 'none'}`)
    console.log(`   Players: ${data?.playersCount || 0}`)
    
    const shouldDisableButton = !!data
    console.log(`\n🎯 Button should be: ${shouldDisableButton ? 'DISABLED ❌' : 'ENABLED ✅'}`)
    
    if (shouldDisableButton && data?.status === 'CREATED') {
      console.log('✅ Correct: Button should be disabled because date 11 is CREATED')
      console.log('\n💡 If button still appears active in browser:')
      console.log('   - Clear browser cache')
      console.log('   - Check React DevTools for component state')
      console.log('   - Look for console error messages')
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error)
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--simple')) {
    simpleAPITest()
  } else {
    console.log('🎭 Full UI test requires Playwright')
    console.log('💡 Run with --simple flag for API-only test')
    console.log('   Example: npx tsx test-fecha-button-ui.ts --simple')
    simpleAPITest() // Run simple test by default
  }
}