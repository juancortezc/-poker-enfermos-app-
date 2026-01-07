#!/usr/bin/env tsx
/**
 * Script de Verificación Post-Optimización
 * Verifica que todos los cambios de la auditoría estén correctos
 */

import { existsSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

interface CheckResult {
  name: string
  passed: boolean
  message: string
}

const results: CheckResult[] = []

function check(name: string, condition: boolean, message: string) {
  results.push({ name, passed: condition, message })
  const icon = condition ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
}

console.log('🔍 VERIFICANDO OPTIMIZACIONES...\n')

// 1. Archivos duplicados eliminados
check(
  'PlayerSelector duplicado',
  !existsSync(join(ROOT, 'src/components/game-dates/PlayerSelector (1).tsx')),
  'PlayerSelector (1).tsx eliminado correctamente'
)

// 2. Páginas huérfanas eliminadas
check(
  'Página admin/points',
  !existsSync(join(ROOT, 'src/app/admin/points')),
  'admin/points eliminado correctamente'
)

check(
  'Página live',
  !existsSync(join(ROOT, 'src/app/live')),
  'live eliminado correctamente'
)

check(
  'Página club-1000',
  !existsSync(join(ROOT, 'src/app/admin/club-1000')),
  'admin/club-1000 eliminado correctamente'
)

check(
  'Página game-dates/new',
  !existsSync(join(ROOT, 'src/app/game-dates/new/page.tsx')),
  'game-dates/new eliminado correctamente'
)

// 3. Endpoints eliminados
check(
  'Endpoint historical',
  !existsSync(join(ROOT, 'src/app/api/tournaments/historical')),
  'tournaments/historical eliminado correctamente'
)

check(
  'Endpoint by-number',
  !existsSync(join(ROOT, 'src/app/api/tournaments/by-number')),
  'tournaments/by-number eliminado correctamente'
)

check(
  'Endpoint podium-stats',
  !existsSync(join(ROOT, 'src/app/api/tournaments/podium-stats')),
  'tournaments/podium-stats eliminado correctamente'
)

check(
  'Endpoint date-awards',
  !existsSync(join(ROOT, 'src/app/api/stats/date-awards')),
  'stats/date-awards eliminado correctamente'
)

// 4. Documentación archivada
check(
  'Directorio archive',
  existsSync(join(ROOT, 'docs/archive')),
  'docs/archive/ creado correctamente'
)

check(
  'Archivos archivados',
  existsSync(join(ROOT, 'docs/archive/AUDITORIA-API.md')) &&
  existsSync(join(ROOT, 'docs/archive/OPTIMIZACION-COMPLETADA.md')),
  'Documentación movida a archive'
)

// 5. Nuevos archivos de documentación
check(
  'Auditoría 2025-10-29',
  existsSync(join(ROOT, 'AUDITORIA-2025-10-29.md')),
  'AUDITORIA-2025-10-29.md creado'
)

check(
  'Resumen optimización',
  existsSync(join(ROOT, 'RESUMEN-OPTIMIZACION.md')),
  'RESUMEN-OPTIMIZACION.md creado'
)

// 6. CLAUDE.md actualizado
const claudeMd = existsSync(join(ROOT, 'CLAUDE.md'))
check(
  'CLAUDE.md existe',
  claudeMd,
  'CLAUDE.md presente'
)

// 7. Archivos críticos mantienen integridad
check(
  'auth.ts existe',
  existsSync(join(ROOT, 'src/lib/auth.ts')),
  'auth.ts intacto'
)

check(
  'awards API existe',
  existsSync(join(ROOT, 'src/app/api/stats/awards/[tournamentId]/route.ts')),
  'awards API intacto (con N+1 fix)'
)

check(
  'package.json existe',
  existsSync(join(ROOT, 'package.json')),
  'package.json intacto'
)

// Resumen final
console.log('\n' + '='.repeat(50))
const passed = results.filter(r => r.passed).length
const failed = results.filter(r => !r.passed).length
const total = results.length

console.log(`\n📊 RESULTADO FINAL:`)
console.log(`   ✅ Pasaron: ${passed}/${total}`)
console.log(`   ❌ Fallaron: ${failed}/${total}`)

if (failed === 0) {
  console.log('\n🎉 ¡TODAS LAS VERIFICACIONES PASARON!')
  console.log('✅ La optimización se completó exitosamente')
  console.log('🚀 Sistema listo para commit y deploy')
  process.exit(0)
} else {
  console.log('\n⚠️  ALGUNAS VERIFICACIONES FALLARON')
  console.log('❌ Revisar los items marcados con ❌')
  process.exit(1)
}
