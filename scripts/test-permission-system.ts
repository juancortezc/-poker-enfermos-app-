#!/usr/bin/env tsx

/**
 * Script de testing completo para el sistema de permisos por rol
 * Ejecuta tests automatizados de todas las funciones críticas
 */

import { canAccess, getDashboardFeatures, getAccessLevel, canAccessRoute, getRestrictionMessage, FeaturePermission } from '../src/lib/permissions'
import { UserRole } from '@prisma/client'

// Colores para output en consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

// Helper para mostrar resultados
function logTest(name: string, passed: boolean, details?: string) {
  const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`
  console.log(`${status} ${name}`)
  if (details && !passed) {
    console.log(`   ${colors.yellow}${details}${colors.reset}`)
  }
}

function logSection(title: string) {
  console.log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`)
}

// Tests individuales
let totalTests = 0
let passedTests = 0

function runTest(name: string, testFn: () => boolean, details?: string) {
  totalTests++
  const passed = testFn()
  if (passed) passedTests++
  logTest(name, passed, details)
}

// 1. TESTS DE FUNCIÓN canAccess()
logSection('TESTS DE FUNCIÓN canAccess()')

// Test Comisión - debe tener acceso a TODO
const allFeatures: FeaturePermission[] = [
  'calendar', 'regulations', 'stats-days', 'stats-parents', 'profile',
  'game-dates', 'tournaments', 'players', 'import', 'timer-control', 'eliminations'
]

runTest('Comisión tiene acceso a todas las funcionalidades', () => {
  return allFeatures.every(feature => canAccess('Comision', feature))
})

// Test Enfermo - acceso limitado
const enfermoAllowed: FeaturePermission[] = ['calendar', 'regulations', 'stats-days', 'profile']
const enfermoBlocked: FeaturePermission[] = ['stats-parents', 'game-dates', 'tournaments', 'players', 'import', 'timer-control', 'eliminations']

runTest('Enfermo tiene acceso a funciones permitidas', () => {
  return enfermoAllowed.every(feature => canAccess('Enfermo', feature))
})

runTest('Enfermo NO tiene acceso a funciones bloqueadas', () => {
  return enfermoBlocked.every(feature => !canAccess('Enfermo', feature))
})

// Test Invitado - solo lectura
const invitadoAllowed: FeaturePermission[] = ['calendar', 'regulations', 'stats-days']
const invitadoBlocked: FeaturePermission[] = ['profile', 'stats-parents', 'game-dates', 'tournaments', 'players', 'import', 'timer-control', 'eliminations']

runTest('Invitado tiene acceso a funciones de lectura', () => {
  return invitadoAllowed.every(feature => canAccess('Invitado', feature))
})

runTest('Invitado NO tiene acceso a funciones bloqueadas', () => {
  return invitadoBlocked.every(feature => !canAccess('Invitado', feature))
})

// 2. TESTS DE FUNCIÓN getAccessLevel()
logSection('TESTS DE FUNCIÓN getAccessLevel()')

runTest('Comisión tiene nivel full', () => {
  return getAccessLevel('Comision') === 'full'
})

runTest('Enfermo tiene nivel limited', () => {
  return getAccessLevel('Enfermo') === 'limited'
})

runTest('Invitado tiene nivel read-only', () => {
  return getAccessLevel('Invitado') === 'read-only'
})

// 3. TESTS DE FUNCIÓN getDashboardFeatures()
logSection('TESTS DE FUNCIÓN getDashboardFeatures()')

runTest('Comisión puede acceder a todas las features del dashboard', () => {
  const features = getDashboardFeatures('Comision')
  return features.base.every(f => f.accessible) && features.admin.every(f => f.accessible)
})

runTest('Enfermo puede acceder a features base pero no a todas las admin', () => {
  const features = getDashboardFeatures('Enfermo')
  const hasBaseAccess = features.base.every(f => f.accessible)
  const hasRestrictedAdmin = features.admin.some(f => !f.accessible)
  return hasBaseAccess && hasRestrictedAdmin
})

runTest('Invitado puede acceder a features base pero no a admin', () => {
  const features = getDashboardFeatures('Invitado')
  const hasBaseAccess = features.base.every(f => f.accessible)
  const noAdminAccess = features.admin.every(f => !f.accessible)
  return hasBaseAccess && noAdminAccess
})

// 4. TESTS DE FUNCIÓN canAccessRoute()
logSection('TESTS DE FUNCIÓN canAccessRoute()')

// Rutas públicas
const publicRoutes = ['/', '/timer', '/ranking', '/players', '/notificaciones']

runTest('Todos los roles pueden acceder a rutas públicas', () => {
  const roles: UserRole[] = ['Comision', 'Enfermo', 'Invitado']
  return roles.every(role => 
    publicRoutes.every(route => canAccessRoute(role, route))
  )
})

// Ruta de perfil
runTest('Solo Comisión y Enfermo pueden acceder a /perfil', () => {
  return canAccessRoute('Comision', '/perfil') && 
         canAccessRoute('Enfermo', '/perfil') && 
         !canAccessRoute('Invitado', '/perfil')
})

// Rutas admin específicas
const adminPublicRoutes = ['/admin/calendar', '/admin/regulations', '/admin/stats']

runTest('Todos pueden acceder a rutas admin públicas', () => {
  const roles: UserRole[] = ['Comision', 'Enfermo', 'Invitado']
  return roles.every(role => 
    adminPublicRoutes.every(route => canAccessRoute(role, route))
  )
})

// Rutas admin restringidas
const adminRestrictedRoutes = ['/admin/import', '/tournaments/new', '/game-dates/config']

runTest('Solo Comisión puede acceder a rutas admin restringidas', () => {
  return adminRestrictedRoutes.every(route => 
    canAccessRoute('Comision', route) && 
    !canAccessRoute('Enfermo', route) && 
    !canAccessRoute('Invitado', route)
  )
})

// 5. TESTS DE EDGE CASES
logSection('TESTS DE EDGE CASES')

runTest('Función maneja valores undefined/null correctamente', () => {
  try {
    // @ts-ignore - Testing edge case
    const result1 = canAccess(undefined, 'calendar')
    // @ts-ignore - Testing edge case  
    const result2 = canAccess('Comision', undefined)
    return result1 === false && result2 === false
  } catch {
    return false
  }
})

runTest('getRestrictionMessage retorna mensajes apropiados', () => {
  const msg1 = getRestrictionMessage('Invitado', 'profile')
  const msg2 = getRestrictionMessage('Enfermo', 'game-dates')
  const msg3 = getRestrictionMessage('Comision', 'calendar') // No debería tener restricción
  
  return msg1.includes('miembros del grupo') && 
         msg2.includes('Solo disponible para Comisión') && 
         msg3 === ''
})

// 6. TESTS DE CONSISTENCIA DE DATOS
logSection('TESTS DE CONSISTENCIA DE DATOS')

runTest('Todas las features están definidas en PERMISSIONS_MAP', () => {
  try {
    allFeatures.forEach(feature => {
      canAccess('Comision', feature) // Esto debería funcionar para todas
    })
    return true
  } catch {
    return false
  }
})

runTest('getDashboardFeatures usa features válidas', () => {
  try {
    const roles: UserRole[] = ['Comision', 'Enfermo', 'Invitado']
    roles.forEach(role => {
      const features = getDashboardFeatures(role)
      // Verificar que todas las features son válidas
      features.all.forEach(feature => {
        if (feature.id !== 'stats') { // stats es especial
          canAccess(role, feature.id as FeaturePermission)
        }
      })
    })
    return true
  } catch {
    return false
  }
})

// 7. TESTS DE LÓGICA DE NEGOCIO
logSection('TESTS DE LÓGICA DE NEGOCIO')

runTest('Stats tiene lógica especial correcta', () => {
  const comisionFeatures = getDashboardFeatures('Comision')
  const enfermoFeatures = getDashboardFeatures('Enfermo')
  const invitadoFeatures = getDashboardFeatures('Invitado')
  
  const comisionStats = comisionFeatures.base.find(f => f.id === 'stats')
  const enfermoStats = enfermoFeatures.base.find(f => f.id === 'stats')
  const invitadoStats = invitadoFeatures.base.find(f => f.id === 'stats')
  
  return comisionStats?.accessible && !comisionStats?.restricted &&
         enfermoStats?.accessible && enfermoStats?.restricted &&
         invitadoStats?.accessible && invitadoStats?.restricted
})

runTest('Jerarquía de roles es correcta', () => {
  // Comisión debe tener más permisos que Enfermo
  const comisionPerms = allFeatures.filter(f => canAccess('Comision', f)).length
  const enfermoPerms = allFeatures.filter(f => canAccess('Enfermo', f)).length
  const invitadoPerms = allFeatures.filter(f => canAccess('Invitado', f)).length
  
  return comisionPerms > enfermoPerms && enfermoPerms >= invitadoPerms
})

// RESUMEN FINAL
logSection('RESUMEN DE TESTING')

const successRate = Math.round((passedTests / totalTests) * 100)
const status = passedTests === totalTests ? 'ÉXITO' : 'FALLO'
const statusColor = passedTests === totalTests ? colors.green : colors.red

console.log(`\n${colors.bold}${statusColor}🔒 SISTEMA DE PERMISOS - ${status}${colors.reset}`)
console.log(`${colors.bold}Tests ejecutados: ${totalTests}${colors.reset}`)
console.log(`${colors.bold}Tests exitosos: ${passedTests}${colors.reset}`)
console.log(`${colors.bold}Tasa de éxito: ${successRate}%${colors.reset}`)

if (passedTests === totalTests) {
  console.log(`\n${colors.green}${colors.bold}✅ SISTEMA LISTO PARA DEPLOY${colors.reset}`)
  console.log(`${colors.green}Todos los tests de permisos han pasado exitosamente.${colors.reset}`)
} else {
  console.log(`\n${colors.red}${colors.bold}❌ ERRORES ENCONTRADOS${colors.reset}`)
  console.log(`${colors.red}Resolver errores antes del deploy.${colors.reset}`)
}

// Mostrar configuración de permisos por rol
logSection('CONFIGURACIÓN FINAL DE PERMISOS')

const roles: UserRole[] = ['Comision', 'Enfermo', 'Invitado']
roles.forEach(role => {
  console.log(`\n${colors.bold}${role}:${colors.reset}`)
  const allowedFeatures = allFeatures.filter(f => canAccess(role, f))
  const blockedFeatures = allFeatures.filter(f => !canAccess(role, f))
  
  console.log(`  ${colors.green}Permitido (${allowedFeatures.length}): ${allowedFeatures.join(', ')}${colors.reset}`)
  if (blockedFeatures.length > 0) {
    console.log(`  ${colors.red}Bloqueado (${blockedFeatures.length}): ${blockedFeatures.join(', ')}${colors.reset}`)
  }
})

process.exit(passedTests === totalTests ? 0 : 1)