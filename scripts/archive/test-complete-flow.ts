import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCompleteFlow() {
  try {
    console.log('🧪 TESTING COMPLETE PIN -> TABLA FLOW\n')

    // 1. Test PIN login
    console.log('1. 🔐 Testing PIN Login...')
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin: '7368' }),
    })

    if (loginResponse.ok) {
      const user = await loginResponse.json()
      console.log('   ✅ Login successful:', user.firstName, user.lastName, `(${user.role})`)
      
      // 2. Test ranking endpoint with PIN
      console.log('\n2. 📊 Testing Ranking Endpoint...')
      const rankingResponse = await fetch('http://localhost:3000/api/tournaments/1/ranking', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer PIN:7368`
        }
      })
      
      if (rankingResponse.ok) {
        const ranking = await rankingResponse.json()
        console.log('   ✅ Ranking loaded successfully')
        console.log(`   📈 Tournament: ${ranking.tournament.name}`)
        console.log(`   👥 Players: ${ranking.rankings.length}`)
        console.log(`   🏆 Winner: ${ranking.rankings[0].playerName} (${ranking.rankings[0].totalPoints} pts)`)
        
        // 3. Test various endpoints that tables might use
        console.log('\n3. 🔍 Testing Other Endpoints...')
        
        // Test active tournament
        const activeTournamentResponse = await fetch('http://localhost:3000/api/tournaments/active', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer PIN:7368`
          }
        })
        
        if (activeTournamentResponse.ok) {
          const activeTournament = await activeTournamentResponse.json()
          console.log('   ✅ Active tournament endpoint working')
          console.log(`   🏟️ Active: ${activeTournament.tournament.name}`)
        } else {
          console.log('   ❌ Active tournament endpoint failed:', activeTournamentResponse.status)
        }
        
        // Test public endpoint (should work without auth)
        const publicResponse = await fetch('http://localhost:3000/api/tournaments/active/public')
        
        if (publicResponse.ok) {
          const publicData = await publicResponse.json()
          console.log('   ✅ Public endpoint working')
          console.log(`   🌐 Public data: ${publicData.tournament.name}`)
        } else {
          console.log('   ❌ Public endpoint failed:', publicResponse.status)
        }
        
        console.log('\n🎯 SUMMARY:')
        console.log('   ✅ PIN Authentication: WORKING')
        console.log('   ✅ Ranking Endpoint: WORKING')
        console.log('   ✅ Tournament Data: AVAILABLE')
        console.log('   ')
        console.log('   If tables are not loading in browser, the issue is likely:')
        console.log('   1. localStorage PIN not being set correctly')
        console.log('   2. SWR fetcher not reading PIN from localStorage')
        console.log('   3. Component error handling hiding the real error')
        console.log('\n   Next step: Check browser console for SWR debug logs')
        
      } else {
        const errorText = await rankingResponse.text()
        console.log('   ❌ Ranking endpoint failed:', rankingResponse.status)
        console.log('   Error:', errorText)
      }
      
    } else {
      console.log('   ❌ Login failed:', loginResponse.status)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run test
testCompleteFlow()
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })