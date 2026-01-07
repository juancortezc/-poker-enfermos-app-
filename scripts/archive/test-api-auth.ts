#!/usr/bin/env node

/**
 * Test if API authentication is working correctly for configured-or-active endpoint
 */

async function testApiAuth() {
  console.log('🔍 Testing API authentication for configured-or-active endpoint\n')
  
  try {
    // Test without auth
    console.log('1. Testing without auth headers:')
    const responseNoAuth = await fetch('http://localhost:3000/api/game-dates/configured-or-active')
    console.log(`   Status: ${responseNoAuth.status}`)
    if (responseNoAuth.status === 200) {
      const data = await responseNoAuth.json()
      console.log(`   Data:`, data)
    } else {
      console.log(`   Error: ${await responseNoAuth.text()}`)
    }
    
    // Test with admin key (if needed)
    console.log('\n2. Testing with admin auth:')
    const responseAdmin = await fetch('http://localhost:3000/api/game-dates/configured-or-active', {
      headers: {
        'Authorization': 'Bearer ADMIN:admin123',
        'Content-Type': 'application/json'
      }
    })
    console.log(`   Status: ${responseAdmin.status}`)
    if (responseAdmin.status === 200) {
      const data = await responseAdmin.json()
      console.log(`   Data:`, data)
    } else {
      console.log(`   Error: ${await responseAdmin.text()}`)
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error)
  }
}

if (require.main === module) {
  testApiAuth()
}