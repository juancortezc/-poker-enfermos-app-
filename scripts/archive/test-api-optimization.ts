/**
 * Test suite para verificar optimizaciones de API
 * - Verifica que endpoints eliminados retornen 404
 * - Verifica que endpoints movidos funcionen en nueva ubicación
 * - Verifica autenticación en endpoints críticos
 */

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  message: string
}

const results: TestResult[] = []

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message })
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
}

async function testEndpointDeleted(endpoint: string, description: string) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`)
    const passed = response.status === 404
    addResult(
      `Deleted: ${endpoint}`,
      passed,
      passed ? `${description} - correctamente eliminado` : `Esperaba 404, obtuvo ${response.status}`
    )
  } catch (error) {
    addResult(`Deleted: ${endpoint}`, false, `Error: ${error}`)
  }
}

async function testEndpointMoved(oldPath: string, newPath: string) {
  try {
    const oldResponse = await fetch(`${BASE_URL}${oldPath}`)
    const newResponse = await fetch(`${BASE_URL}${newPath}`)

    const passed = oldResponse.status === 404 && newResponse.status !== 404
    addResult(
      `Moved: ${oldPath} → ${newPath}`,
      passed,
      passed
        ? 'Endpoint movido correctamente'
        : `Old: ${oldResponse.status}, New: ${newResponse.status}`
    )
  } catch (error) {
    addResult(`Moved: ${oldPath} → ${newPath}`, false, `Error: ${error}`)
  }
}

async function testEndpointRequiresAuth(endpoint: string, method = 'GET') {
  try {
    const options: RequestInit = { method }
    if (method !== 'GET') {
      options.headers = { 'Content-Type': 'application/json' }
      options.body = JSON.stringify({})
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const passed = response.status === 401
    addResult(
      `Auth: ${method} ${endpoint}`,
      passed,
      passed ? 'Correctamente protegido' : `Esperaba 401, obtuvo ${response.status}`
    )
  } catch (error) {
    addResult(`Auth: ${method} ${endpoint}`, false, `Error: ${error}`)
  }
}

async function runTests() {
  console.log('\n🧪 INICIANDO TESTS DE OPTIMIZACIÓN API\n')
  console.log('=' .repeat(60))

  // Test 1: Endpoints eliminados deben retornar 404
  console.log('\n📋 Fase 1: Verificar endpoints eliminados\n')
  await testEndpointDeleted(
    '/api/stats/parent-child/1/public',
    'Parent-child public duplicado'
  )
  await testEndpointDeleted(
    '/api/tournaments/active/public',
    'Active tournament public duplicado'
  )
  await testEndpointDeleted(
    '/api/tournaments/next',
    'Next tournament (retornaba null)'
  )

  // Test 2: Endpoints movidos
  console.log('\n📋 Fase 2: Verificar endpoints movidos\n')
  await testEndpointMoved(
    '/api/proposals/public',
    '/api/proposals-v2/public'
  )

  // Test 3: Autenticación en endpoints críticos
  console.log('\n📋 Fase 3: Verificar autenticación\n')
  await testEndpointRequiresAuth('/api/players/ABC123/role', 'PATCH')
  await testEndpointRequiresAuth('/api/admin/import/validate', 'POST')
  await testEndpointRequiresAuth('/api/admin/import/execute', 'POST')

  // Test 4: Endpoints públicos funcionan sin auth
  console.log('\n📋 Fase 4: Verificar endpoints públicos\n')
  try {
    const response = await fetch(`${BASE_URL}/api/proposals-v2/public`)
    const passed = response.status === 200
    addResult(
      'Public: /api/proposals-v2/public',
      passed,
      passed ? 'Accesible sin auth' : `Status: ${response.status}`
    )
  } catch (error) {
    addResult('Public: /api/proposals-v2/public', false, `Error: ${error}`)
  }

  // Resumen
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 RESUMEN DE TESTS\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`Total: ${total}`)
  console.log(`✅ Pasados: ${passed}`)
  console.log(`❌ Fallados: ${failed}`)
  console.log(`📈 Tasa de éxito: ${((passed / total) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log('\n⚠️  Tests fallados:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`)
    })
  }

  console.log('\n' + '='.repeat(60))

  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
runTests().catch(error => {
  console.error('💥 Error ejecutando tests:', error)
  process.exit(1)
})
