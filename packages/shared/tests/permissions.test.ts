import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccess,
  canAccessRoute,
  getAccessLevel,
  getDashboardFeatures,
  getRestrictionMessage,
  type FeaturePermission,
  type UserRole,
} from '../src/index'

const COMISION_SOLO: FeaturePermission[] = [
  'stats-parents', 'game-dates', 'tournaments', 'players', 'import',
  'eliminations', 'proposals-admin', 'notifications-config', 'technical-docs',
]

test('matriz de roles (tabla de CLAUDE.md)', () => {
  for (const f of COMISION_SOLO) {
    assert.equal(canAccess('Comision', f), true, f)
    assert.equal(canAccess('Enfermo', f), false, f)
    assert.equal(canAccess('Invitado', f), false, f)
  }
  for (const f of ['profile', 'my-proposals'] as FeaturePermission[]) {
    assert.equal(canAccess('Enfermo', f), true, f)
    assert.equal(canAccess('Invitado', f), false, f)
  }
  for (const f of ['calendar', 'regulations', 'stats-days', 't29-proposals'] as FeaturePermission[]) {
    assert.equal(canAccess('Invitado', f), true, f)
  }
})

test('rol o feature desconocidos: se niega', () => {
  const raro = 'Admin' as UserRole
  assert.equal(canAccess(raro, 'calendar'), false)
  assert.equal(canAccess('Comision', 'inventada' as FeaturePermission), false)
  assert.equal(getAccessLevel(raro), 'read-only')
  assert.equal(canAccessRoute(raro, '/admin/stats'), false)
  assert.equal(canAccessRoute(raro, '/registro'), false)
})

test('niveles de acceso', () => {
  assert.equal(getAccessLevel('Comision'), 'full')
  assert.equal(getAccessLevel('Enfermo'), 'limited')
  assert.equal(getAccessLevel('Invitado'), 'read-only')
})

test('rutas: lo restringido solo para Comision', () => {
  for (const r of ['/registro', '/game-dates/config', '/tournaments', '/tournaments/3/edit', '/admin/import', '/admin/propuestas', '/admin/stats', '/admin/tecnico', '/admin/calendar/create']) {
    assert.equal(canAccessRoute('Comision', r), true, r)
    assert.equal(canAccessRoute('Enfermo', r), false, r)
    assert.equal(canAccessRoute('Invitado', r), false, r)
  }
})

test('rutas publicas y de perfil', () => {
  for (const r of ['/', '/timer', '/ranking', '/players', '/t29', '/admin/fecha', '/admin/resultados', '/admin/enfermos', '/admin/calendar', '/admin/sin-ganar']) {
    assert.equal(canAccessRoute('Invitado', r), true, r)
  }
  assert.equal(canAccessRoute('Enfermo', '/perfil'), true)
  assert.equal(canAccessRoute('Invitado', '/perfil'), false)
})

test('rutas: coincidencia exacta en las publicas, todo lo demas se niega', () => {
  // la barra final o mayusculas no estan en la lista publica: se niega por defecto
  assert.equal(canAccessRoute('Invitado', '/timer/'), false)
  assert.equal(canAccessRoute('Invitado', '/T29'), false)
  assert.equal(canAccessRoute('Comision', '/ruta-que-no-existe'), false)
  assert.equal(canAccessRoute('Comision', ''), false)
})

test('dashboard: Invitado ve todo pero bloqueado lo de Comision', () => {
  const { base, admin, all } = getDashboardFeatures('Invitado')
  assert.equal(all.length, base.length + admin.length)
  assert.ok(admin.every((f) => !f.accessible && f.restricted))
  assert.equal(base.find((f) => f.id === 'my-proposals')?.accessible, false)
  assert.ok(getDashboardFeatures('Comision').all.every((f) => f.accessible && !f.restricted))
})

test('mensajes de restriccion', () => {
  assert.equal(getRestrictionMessage('Comision', 'import'), '')
  assert.equal(getRestrictionMessage('Invitado', 'profile'), 'Solo disponible para miembros del grupo')
  assert.equal(getRestrictionMessage('Enfermo', 'eliminations'), 'Solo disponible para Comisión')
  assert.equal(getRestrictionMessage('Enfermo', 'technical-docs'), 'Acceso restringido')
})
