// Test script to replicate Dashboard fetch behavior
async function testDashboardFetch() {
  console.log('🔄 Testing Dashboard fetch behavior...')
  
  try {
    const response = await fetch('http://localhost:3001/api/game-dates/configured-or-active')
    
    console.log('📡 Response status:', response.status)
    console.log('📡 Response ok:', response.ok)
    
    if (response.ok) {
      const data = await response.json()
      console.log('📋 Response data:', data)
      
      // More explicit null checking (same as Dashboard)
      const hasActiveDate = data !== null && data !== undefined && 
                            (data.status === 'CREATED' || data.status === 'in_progress')
      
      console.log('🔍 Detailed check:', {
        dataIsNull: data === null,
        dataIsUndefined: data === undefined,
        dataStatus: data?.status,
        statusIsCREATED: data?.status === 'CREATED',
        statusIsInProgress: data?.status === 'in_progress',
        finalResult: hasActiveDate
      })
      
      console.log('🎯 Computed hasActiveDate:', hasActiveDate)
      console.log('✅ Button should be DISABLED:', hasActiveDate)
      
      if (hasActiveDate) {
        console.log('🎨 Expected visual state:')
        console.log('   • Icon background: bg-gray-700/50')
        console.log('   • Icon color: text-gray-500')
        console.log('   • No navigation (wrapped in div)')
        console.log('   • Text below: "Fecha activa"')
      } else {
        console.log('🎨 Expected visual state:')
        console.log('   • Icon background: bg-poker-red')
        console.log('   • Icon color: text-white')
        console.log('   • Navigation enabled (wrapped in Link)')
      }
      
    } else {
      console.log('❌ Response not OK - button should be enabled')
    }
    
  } catch (error) {
    console.error('❌ Fetch error:', error)
    console.log('❌ Error occurred - button should be enabled')
  }
}

testDashboardFetch()