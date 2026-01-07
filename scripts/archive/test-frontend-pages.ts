/**
 * Test suite para verificar páginas críticas del frontend
 */

const BASE_URL = 'http://localhost:3000'

interface PageTest {
  path: string
  description: string
  expectedStatus: number
}

const criticalPages: PageTest[] = [
  { path: '/', description: 'Home/Dashboard', expectedStatus: 200 },
  { path: '/registro', description: 'Registro de eliminaciones', expectedStatus: 200 },
  { path: '/timer', description: 'Timer', expectedStatus: 200 },
  { path: '/t29', description: 'T29 Propuestas', expectedStatus: 200 },
  { path: '/propuestas-v2', description: 'Mis Propuestas', expectedStatus: 200 },
  { path: '/admin/stats', description: 'Admin Stats', expectedStatus: 200 },
  { path: '/admin/propuestas', description: 'Admin Propuestas', expectedStatus: 200 },
  { path: '/tournaments', description: 'Torneos', expectedStatus: 200 },
  { path: '/players', description: 'Jugadores', expectedStatus: 200 },
  { path: '/game-dates/config', description: 'Config Game Dates', expectedStatus: 200 },
]

async function testPage(page: PageTest): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}${page.path}`)
    const passed = response.status === page.expectedStatus

    const icon = passed ? '✅' : '❌'
    console.log(
      `${icon} ${page.description.padEnd(30)} [${page.path.padEnd(25)}] → ${response.status}`
    )

    return passed
  } catch (error) {
    console.log(`❌ ${page.description.padEnd(30)} [${page.path.padEnd(25)}] → ERROR`)
    return false
  }
}

async function runTests() {
  console.log('\n🌐 TESTING PÁGINAS CRÍTICAS DEL FRONTEND\n')
  console.log('='.repeat(80))
  console.log()

  let passed = 0
  let failed = 0

  for (const page of criticalPages) {
    const result = await testPage(page)
    if (result) {
      passed++
    } else {
      failed++
    }
  }

  console.log()
  console.log('='.repeat(80))
  console.log('\n📊 RESUMEN\n')
  console.log(`Total: ${criticalPages.length}`)
  console.log(`✅ Pasados: ${passed}`)
  console.log(`❌ Fallados: ${failed}`)
  console.log(`📈 Tasa de éxito: ${((passed / criticalPages.length) * 100).toFixed(1)}%`)
  console.log()

  if (failed === 0) {
    console.log('🎉 ¡Todas las páginas cargaron correctamente!')
  }

  console.log('='.repeat(80))
  console.log()

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(error => {
  console.error('💥 Error:', error)
  process.exit(1)
})
