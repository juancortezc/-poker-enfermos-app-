/**
 * T36: reglas puras de integridad de datos de la Comisión.
 * - Fechas: sin jugadores repetidos; participantes = jugadores ∪ invitados.
 * - Importación CSV: misma fecha, posiciones 1..N, puntos de la tabla oficial.
 * - Torneo: no se finaliza con fechas abiertas.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createGameDateSchema,
  updateGameDateSchema,
  gameDateParticipantIds,
  importExecuteSchema,
  importRowsProblems,
  calculatePointsForPosition,
  openGameDateNumbers,
  openDatesMessage,
  isGameDateEditable,
  type CsvElimination,
} from '../src/index'

const base = { tournamentId: 1, dateNumber: 3, scheduledDate: '2026-12-01' }

test('fecha: playerIds repetidos se rechazan (alta y edición)', () => {
  const r = createGameDateSchema.safeParse({ ...base, playerIds: ['a', 'b', 'a'] })
  assert.equal(r.success, false)
  assert.match(r.error!.issues[0].message, /repetido.*a/)

  const u = updateGameDateSchema.safeParse({ action: 'update', playerIds: ['a', ' a'] })
  assert.equal(u.success, false, 'el trim cuenta: " a" es el mismo que "a"')

  const g = createGameDateSchema.safeParse({ ...base, playerIds: ['a'], guestIds: ['g', 'g'] })
  assert.equal(g.success, false)
})

test('fecha: lista válida pasa y vacía se rechaza', () => {
  assert.equal(createGameDateSchema.safeParse({ ...base, playerIds: ['a', 'b'] }).success, true)
  assert.equal(createGameDateSchema.safeParse({ ...base, playerIds: [] }).success, false)
  assert.equal(updateGameDateSchema.safeParse({ action: 'update', playerIds: [] }).success, false)
  // Invitados también dentro de playerIds (como mandan la web y la app): válido.
  assert.equal(
    updateGameDateSchema.safeParse({ action: 'update', playerIds: ['a', 'g'], guestIds: ['g'] }).success,
    true
  )
})

test('fecha: participantes = jugadores ∪ invitados, sin repetidos', () => {
  assert.deepEqual(gameDateParticipantIds(['a', 'g'], ['g']), ['a', 'g'])
  assert.deepEqual(gameDateParticipantIds(['a'], ['g']), ['a', 'g'])
  assert.deepEqual(gameDateParticipantIds(['a'], null), ['a'])
})

function csv(n: number, overrides: Partial<CsvElimination>[] = []): CsvElimination[] {
  return Array.from({ length: n }, (_, i) => ({
    torneo: 'Torneo 29',
    fecha: 4,
    date: '2026-12-01',
    posicion: i + 1,
    eliminado: `Jugador ${i + 1}`,
    eliminador: i === 0 ? '' : 'Jugador 1',
    puntos: calculatePointsForPosition(i + 1, n),
    ...(overrides[i] ?? {}),
  }))
}

test('import: CSV con los puntos de la tabla no tiene problemas', () => {
  for (const n of [3, 9, 10, 18, 24]) {
    assert.deepEqual(importRowsProblems(csv(n)), [], `${n} jugadores`)
    assert.equal(importExecuteSchema.safeParse({ eliminations: csv(n) }).success, true)
  }
})

test('import: puntos distintos a la tabla se rechazan', () => {
  const rows = csv(10)
  rows[0] = { ...rows[0], puntos: 30 }
  const problems = importRowsProblems(rows)
  assert.equal(problems.length, 1)
  assert.match(problems[0].message, /Posición 1: 30 puntos, la tabla da \d+ con 10 jugadores/)
  const r = importExecuteSchema.safeParse({ eliminations: rows })
  assert.equal(r.success, false)
  assert.deepEqual(r.error!.issues[0].path, ['eliminations', 0])
})

test('import: posiciones repetidas, faltantes o fuera de rango', () => {
  const rows = csv(5)
  rows[4] = { ...rows[4], posicion: 4 }
  const msgs = importRowsProblems(rows).map((p) => p.message)
  assert.ok(msgs.some((m) => /Posición 4 repetida/.test(m)))
  assert.ok(msgs.some((m) => /Falta la posición 5/.test(m)))

  const far = csv(5)
  far[4] = { ...far[4], posicion: 9 }
  assert.ok(importRowsProblems(far).some((p) => /fuera de rango/.test(p.message)))
})

test('import: filas de otra fecha y jugador eliminado dos veces', () => {
  const rows = csv(5)
  rows[2] = { ...rows[2], fecha: 5 }
  rows[3] = { ...rows[3], eliminado: 'jugador 1' }
  const msgs = importRowsProblems(rows).map((p) => p.message)
  assert.ok(msgs.some((m) => /misma fecha/.test(m)))
  assert.ok(msgs.some((m) => /más de una vez/.test(m)))
})

test('torneo: fechas abiertas = ni completadas ni canceladas', () => {
  const dates = [
    { dateNumber: 3, status: 'pending' },
    { dateNumber: 1, status: 'completed' },
    { dateNumber: 2, status: 'cancelled' },
    { dateNumber: 4, status: 'CREATED' },
    { dateNumber: 5, status: 'in_progress' },
  ]
  assert.deepEqual(openGameDateNumbers(dates), [3, 4, 5])
  assert.deepEqual(openGameDateNumbers(dates.slice(1, 3)), [])
  assert.match(openDatesMessage(29, [12]), /^No se puede finalizar el Torneo 29: la fecha 12 sigue abierta/)
  assert.match(openDatesMessage(29, [11, 12]), /las fechas 11, 12 siguen abiertas/)
})

test('fecha editable: solo pendiente o configurada', () => {
  assert.equal(isGameDateEditable('pending'), true)
  assert.equal(isGameDateEditable('CREATED'), true)
  for (const s of ['in_progress', 'completed', 'cancelled']) assert.equal(isGameDateEditable(s), false)
})
