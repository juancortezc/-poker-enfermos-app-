import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  proposalInputSchema,
  proposalImageUrlSchema,
  adminProposalsQuerySchema,
  PROPOSAL_IMAGE_URL_MAX,
  tournamentIdParamsSchema,
  gameDateIdParamsSchema,
  parentChildRelationParamsSchema,
  tournamentPlayerParamsSchema,
  activeUsersQuerySchema,
  importExecuteSchema,
  fixStuckDateSchema,
  repairTournamentSchema,
  repairTournamentQuerySchema,
} from '../src/index'

const base = { title: ' T ', objective: 'O', situation: 'S', proposal: 'P' }

test('propuesta: recorta y la imagen vacia o ausente es null', () => {
  assert.deepEqual(proposalInputSchema.parse({ ...base, imageUrl: '  ' }), {
    title: 'T', objective: 'O', situation: 'S', proposal: 'P', imageUrl: null,
  })
  assert.equal(proposalInputSchema.parse(base).imageUrl, null)
  assert.equal(proposalInputSchema.parse({ ...base, imageUrl: null }).imageUrl, null)
})

test('propuesta: campos obligatorios, tipos y limites', () => {
  for (const bad of [{ ...base, title: '   ' }, { ...base, objective: 5 }, { ...base, proposal: null }, { title: 'x' }]) {
    const r = proposalInputSchema.safeParse(bad)
    assert.equal(r.success, false)
  }
  for (const body of [null, 'x', [], 42]) assert.equal(proposalInputSchema.safeParse(body).success, false)
  const largo = proposalInputSchema.safeParse({ ...base, title: 'x'.repeat(201) })
  assert.equal(largo.success, false)
  assert.match(largo.error!.issues[0].message, /no puede exceder 200/)
  assert.equal(proposalInputSchema.safeParse({ ...base, title: 'x'.repeat(200) }).success, true)
})

test('propuesta: imageUrl solo https', () => {
  assert.equal(proposalImageUrlSchema.parse(' https://a.b/c.jpg '), 'https://a.b/c.jpg')
  for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AA', 'http://e.com/a.png', 'no es url', 'https://', 123,
    'https://e.com/' + 'a'.repeat(PROPOSAL_IMAGE_URL_MAX)]) {
    assert.equal(proposalImageUrlSchema.safeParse(bad).success, false, String(bad))
  }
})

test('query de propuestas admin', () => {
  assert.deepEqual(adminProposalsQuerySchema.parse({}), {})
  assert.deepEqual(adminProposalsQuerySchema.parse({ includeInactive: 'true', authorId: 'abc' }), { includeInactive: true, authorId: 'abc' })
  assert.equal(adminProposalsQuerySchema.safeParse({ includeInactive: 'quizas' }).success, false)
})

test('params de stats', () => {
  assert.deepEqual(tournamentIdParamsSchema.parse({ tournamentId: '3' }), { tournamentId: 3 })
  assert.deepEqual(gameDateIdParamsSchema.parse({ gameDateId: '28' }), { gameDateId: 28 })
  assert.deepEqual(parentChildRelationParamsSchema.parse({ tournamentId: '3', relationId: '10' }), { tournamentId: 3, relationId: 10 })
  assert.deepEqual(tournamentPlayerParamsSchema.parse({ tournamentId: '3', playerId: 'cm1' }), { tournamentId: 3, playerId: 'cm1' })
  for (const bad of [{ tournamentId: 'abc' }, { tournamentId: '0' }, { tournamentId: '-1' }, { tournamentId: '1.5' }, {}]) {
    assert.equal(tournamentIdParamsSchema.safeParse(bad).success, false, JSON.stringify(bad))
  }
  assert.equal(tournamentPlayerParamsSchema.safeParse({ tournamentId: '3', playerId: '' }).success, false)
})

test('active-users: days por defecto 7, entero entre 1 y 365', () => {
  assert.deepEqual(activeUsersQuerySchema.parse({}), { days: 7 })
  assert.deepEqual(activeUsersQuerySchema.parse({ days: '30' }), { days: 30 })
  for (const days of ['0', '366', 'x', '2.5']) assert.equal(activeUsersQuerySchema.safeParse({ days }).success, false, days)
})

test('import execute: filas del CSV validado', () => {
  const fila = { torneo: 'Torneo 28', fecha: 1, date: '2025-01-14', posicion: 2, eliminado: 'Juan', eliminador: 'Pedro', puntos: 25 }
  assert.deepEqual(importExecuteSchema.parse({ eliminations: [fila] }).eliminations[0], fila)
  assert.equal(importExecuteSchema.parse({ eliminations: [{ ...fila, eliminador: undefined }] }).eliminations[0].eliminador, '')
  for (const bad of [
    {},
    { eliminations: [] },
    { eliminations: 'x' },
    { eliminations: [{ ...fila, puntos: null }] },
    { eliminations: [{ ...fila, puntos: 31 }] },
    { eliminations: [{ ...fila, posicion: '2' }] },
    { eliminations: [{ ...fila, date: '14/01/2025' }] },
    { eliminations: [{ ...fila, eliminado: ' ' }] },
  ]) {
    assert.equal(importExecuteSchema.safeParse(bad).success, false, JSON.stringify(bad))
  }
})

test('admin: fix-stuck-date y repair-tournament', () => {
  assert.deepEqual(fixStuckDateSchema.parse({ gameDateId: 5 }), { gameDateId: 5 })
  assert.deepEqual(repairTournamentSchema.parse({ tournamentId: 3 }), { tournamentId: 3 })
  assert.deepEqual(repairTournamentQuerySchema.parse({ tournamentId: '3' }), { tournamentId: 3 })
  for (const bad of [{}, { gameDateId: '5' }, { gameDateId: 0 }, { gameDateId: 1.5 }]) {
    assert.equal(fixStuckDateSchema.safeParse(bad).success, false, JSON.stringify(bad))
  }
  assert.equal(repairTournamentQuerySchema.safeParse({}).success, false)
})
