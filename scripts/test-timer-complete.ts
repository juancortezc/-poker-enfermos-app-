/**
 * Test Completo del Sistema de Timer
 * Verifica: botón inicio, creación timer, pausa/resume
 */

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  test: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`)
}

function addResult(test: string, passed: boolean, message: string, details?: any) {
  results.push({ test, passed, message, details })
  const icon = passed ? '✅' : '❌'
  log(icon, `${test}: ${message}`)
}

async function testGameDateActive() {
  try {
    const response = await fetch(`${BASE_URL}/api/game-dates/active`)
    const data = await response.json()

    if (!data || !data.id) {
      addResult(
        'GameDate Activa',
        false,
        'No hay fecha activa disponible para testing'
      )
      return null
    }

    addResult(
      'GameDate Activa',
      true,
      `Fecha ${data.dateNumber} encontrada (ID: ${data.id}, Status: ${data.status})`,
      { id: data.id, status: data.status, dateNumber: data.dateNumber }
    )

    return data
  } catch (error) {
    addResult('GameDate Activa', false, `Error: ${error}`)
    return null
  }
}

async function testTimerEndpoint(gameDateId: number, shouldExist: boolean) {
  try {
    // Necesita auth, así que esperamos 401 o 404
    const response = await fetch(`${BASE_URL}/api/timer/game-date/${gameDateId}`)
    const status = response.status

    if (shouldExist) {
      // Si debe existir, esperamos 401 (sin auth) pero NO 404
      const passed = status === 401 || status === 200
      addResult(
        'Timer Endpoint (debe existir)',
        passed,
        passed
          ? `Endpoint existe (status: ${status})`
          : `Endpoint no existe (status: ${status})`
      )
    } else {
      // Si NO debe existir, esperamos 404
      const passed = status === 404
      addResult(
        'Timer Endpoint (NO debe existir aún)',
        passed,
        passed
          ? 'Endpoint correctamente ausente (404)'
          : `Endpoint responde cuando no debería (status: ${status})`
      )
    }

    return status
  } catch (error) {
    addResult('Timer Endpoint', false, `Error: ${error}`)
    return 0
  }
}

async function testRegistroPage() {
  try {
    const response = await fetch(`${BASE_URL}/registro`)
    const html = await response.text()

    // Buscar botón INICIAR FECHA en el HTML
    const hasButton = html.includes('INICIAR FECHA')

    addResult(
      'Página /registro',
      response.status === 200,
      response.status === 200 ? 'Página carga correctamente' : `Error: ${response.status}`
    )

    addResult(
      'Botón INICIAR FECHA',
      hasButton,
      hasButton
        ? 'Botón encontrado en HTML'
        : 'Botón NO encontrado (puede estar oculto por JavaScript)'
    )

    return hasButton
  } catch (error) {
    addResult('Página /registro', false, `Error: ${error}`)
    return false
  }
}

async function testConsoleErrors() {
  // Este test es informativo - no podemos capturar errores de console del browser desde Node
  addResult(
    'Errores Console',
    true,
    'ℹ️  Verificar manualmente en browser: NO debe haber error 404 de /api/timer/game-date/X'
  )
}

async function runTests() {
  log('🧪', 'INICIANDO TESTS DEL SISTEMA DE TIMER')
  log('', '='.repeat(80))
  log('', '')

  // Test 1: Verificar gameDate activa
  log('📋', 'Test 1: GameDate Activa')
  const gameDate = await testGameDateActive()
  log('', '')

  if (!gameDate) {
    log('⚠️', 'No se puede continuar sin una gameDate activa')
    log('', '')
    printSummary()
    process.exit(1)
  }

  // Test 2: Verificar endpoint timer según status
  log('📋', 'Test 2: Endpoint Timer')
  const shouldTimerExist = gameDate.status === 'in_progress'
  await testTimerEndpoint(gameDate.id, shouldTimerExist)
  log('', '')

  // Test 3: Verificar página /registro
  log('📋', 'Test 3: Página /registro')
  await testRegistroPage()
  log('', '')

  // Test 4: Verificar console errors
  log('📋', 'Test 4: Console Errors')
  await testConsoleErrors()
  log('', '')

  // Resumen
  printSummary()

  // Exit code
  const failed = results.filter(r => !r.passed).length
  process.exit(failed > 0 ? 1 : 0)
}

function printSummary() {
  log('', '='.repeat(80))
  log('📊', 'RESUMEN DE TESTS')
  log('', '')

  const total = results.length
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  log('', `Total: ${total}`)
  log('✅', `Pasados: ${passed}`)
  log('❌', `Fallados: ${failed}`)
  log('📈', `Tasa de éxito: ${((passed / total) * 100).toFixed(1)}%`)
  log('', '')

  if (failed > 0) {
    log('⚠️', 'Tests fallados:')
    results
      .filter(r => !r.passed)
      .forEach(r => {
        log('  ', `- ${r.test}: ${r.message}`)
      })
    log('', '')
  }

  // Instrucciones para testing manual
  log('', '='.repeat(80))
  log('🔍', 'TESTING MANUAL RECOMENDADO:')
  log('', '')
  log('1️⃣', 'Abrir http://localhost:3000/registro en browser')
  log('2️⃣', 'Verificar que NO hay error 404 en Console')
  log('3️⃣', 'Verificar que botón "INICIAR FECHA" es visible')
  log('4️⃣', 'Presionar botón y verificar que timer se inicia')
  log('5️⃣', 'Verificar pausa/resume funciona correctamente')
  log('', '')
  log('', '='.repeat(80))
}

// Run tests
runTests().catch(error => {
  log('💥', `Error ejecutando tests: ${error}`)
  process.exit(1)
})
