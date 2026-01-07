import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function debugAuthIssue() {
  try {
    console.log('🔍 DEBUGGING AUTHENTICATION ISSUE\n')

    // 1. Verificar usuarios con PINs
    console.log('1. 📋 CHECKING USERS WITH PINs:')
    const usersWithPins = await prisma.player.findMany({
      where: {
        pin: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true
      }
    })

    console.log(`   Found ${usersWithPins.length} users with PINs`)
    
    // 2. Verificar específicamente el usuario 7368
    console.log('\n2. 🎯 CHECKING PIN 7368 (Juan Antonio Cortez):')
    const testPin = '7368'
    let foundUser = null
    
    for (const user of usersWithPins) {
      if (user.pin && await bcrypt.compare(testPin, user.pin)) {
        foundUser = user
        break
      }
    }
    
    if (foundUser) {
      console.log('   ✅ PIN 7368 found and verified:')
      console.log(`      - Name: ${foundUser.firstName} ${foundUser.lastName}`)
      console.log(`      - Role: ${foundUser.role}`)
      console.log(`      - ID: ${foundUser.id}`)
    } else {
      console.log('   ❌ PIN 7368 NOT FOUND or INVALID')
      
      // Check if user exists without PIN
      const userWithoutPin = await prisma.player.findFirst({
        where: {
          firstName: 'Juan Antonio',
          lastName: 'Cortez'
        }
      })
      
      if (userWithoutPin) {
        console.log('   🔍 User exists but PIN issue:')
        console.log(`      - Has PIN field: ${!!userWithoutPin.pin}`)
        console.log(`      - PIN value: ${userWithoutPin.pin?.substring(0, 10)}...`)
      }
    }

    // 3. Test API endpoint manually
    console.log('\n3. 🌐 TESTING API ENDPOINT:')
    
    try {
      const response = await fetch('http://localhost:3000/api/tournaments/1/ranking', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer PIN:7368'
        }
      })
      
      console.log(`   Response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('   ✅ API request successful')
        console.log(`   📊 Data received: ${Array.isArray(data) ? data.length + ' items' : 'object'}`)
      } else {
        const errorText = await response.text()
        console.log('   ❌ API request failed')
        console.log(`   Error: ${errorText}`)
      }
    } catch (error) {
      console.log('   ❌ API request error:', error)
    }

    // 4. Check if ranking endpoint has auth
    console.log('\n4. 🔒 CHECKING RANKING ENDPOINT AUTH:')
    console.log('   Endpoint: /api/tournaments/[id]/ranking')
    console.log('   Current state: NO AUTHENTICATION REQUIRED ❌')
    console.log('   Expected: Should require authentication ✅')

    // 5. Manual auth test
    console.log('\n5. 🧪 MANUAL AUTH VALIDATION TEST:')
    
    const mockHeaders = new Headers()
    mockHeaders.set('authorization', 'Bearer PIN:7368')
    
    const mockRequest = {
      headers: {
        get: (key: string) => mockHeaders.get(key)
      }
    } as any
    
    // Import and test validateApiAccess
    const { validateApiAccess } = await import('../src/lib/api-auth')
    const authResult = await validateApiAccess(mockRequest)
    
    if (authResult) {
      console.log('   ✅ Auth validation successful')
      console.log(`      User: ${authResult.firstName} ${authResult.lastName}`)
      console.log(`      Role: ${authResult.role}`)
    } else {
      console.log('   ❌ Auth validation failed')
    }

    console.log('\n🎯 SUMMARY:')
    console.log('   The issue is likely that /api/tournaments/[id]/ranking')
    console.log('   does NOT have authentication validation, while the SWR')
    console.log('   fetcher is sending auth headers.')
    console.log('\n   SOLUTION: Add validateApiAccess to ranking endpoint')

  } catch (error) {
    console.error('❌ Debug script error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run debug
debugAuthIssue()
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })