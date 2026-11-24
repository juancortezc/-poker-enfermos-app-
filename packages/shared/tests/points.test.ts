/**
 * Puntos por posicion. Los valores esperados salen de la implementacion de
 * src/lib/tournament-utils.ts en 0b3ed0f (antes del monorepo).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculatePointsForPosition,
  getWinnerPoints,
  getPointsDistribution,
  getPointsTable,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from '../src/index'

test('tabla de 10 jugadores', () => {
  assert.deepEqual(getPointsDistribution(10), [17, 14, 11, 8, 7, 6, 5, 4, 3, 1])
})

test('tabla de 24 jugadores (el maximo)', () => {
  assert.deepEqual(
    getPointsDistribution(24),
    [31, 28, 25, 22, 21, 20, 19, 18, 17, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  )
})

test('de 10 a 24 jugadores: enteros, ultimo = 1, estrictamente decreciente y saltos fijos', () => {
  for (let n = 10; n <= 24; n++) {
    const d = getPointsDistribution(n)
    assert.equal(d.length, n)
    assert.equal(d[n - 1], 1, `ultimo con ${n}`)
    d.forEach((p, i) => assert.ok(Number.isInteger(p), `entero ${n}/${i + 1}`))
    for (let i = 1; i < n; i++) assert.ok(d[i - 1] > d[i], `decreciente ${n}/${i}`)
    // podio +3, 9no +2 sobre el 10mo, 4-8 +1
    assert.equal(d[0] - d[1], 3)
    assert.equal(d[1] - d[2], 3)
    assert.equal(d[2] - d[3], 3)
    assert.equal(d[7] - d[8], 1)
    assert.equal(d[8] - d[9], 2)
    assert.equal(getWinnerPoints(n), d[0])
  }
})

test('posiciones fuera de rango valen 0', () => {
  for (const n of [10, 18, 24]) {
    assert.equal(calculatePointsForPosition(0, n), 0)
    assert.equal(calculatePointsForPosition(-1, n), 0)
    assert.equal(calculatePointsForPosition(n + 1, n), 0)
    assert.equal(calculatePointsForPosition(-Infinity, n), 0)
    assert.equal(calculatePointsForPosition(Infinity, n), 0)
  }
  assert.equal(calculatePointsForPosition(1, 0), 0)
  assert.equal(calculatePointsForPosition(1, -5), 0)
})

test('mas de 24 jugadores: tope 24, las posiciones sobrantes valen 1 (nunca undefined)', () => {
  assert.equal(calculatePointsForPosition(1, 30), 31)
  for (let p = 24; p <= 30; p++) assert.equal(calculatePointsForPosition(p, 30), 1)
  assert.deepEqual(getPointsDistribution(30), getPointsDistribution(24))
})

test('getPointsTable cubre MIN..MAX y coincide con la distribucion', () => {
  const t = getPointsTable()
  assert.deepEqual(Object.keys(t).map(Number), Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS))
  for (let n = 10; n <= 24; n++) assert.deepEqual(t[n], getPointsDistribution(n))
})

// Defecto heredado (identico en 0b3ed0f): con 9 jugadores o menos la tabla se
// construye sin posicion 10 y `pointsArray[9] + 2` da NaN, que contamina todo
// el arreglo. Queda como `todo` hasta que la Comision confirme la tabla de 9.
test('con 9 jugadores la tabla deberia ser numerica', { todo: 'pendiente: hoy devuelve NaN (defecto heredado)' }, () => {
  const d = getPointsDistribution(9)
  d.forEach((p) => assert.ok(Number.isInteger(p)))
})

// Entradas no enteras: hoy devuelven undefined o lanzan RangeError (igual que
// en 0b3ed0f). Se documenta el comportamiento para que un cambio sea consciente.
test('entradas no enteras: comportamiento heredado documentado', () => {
  assert.equal(calculatePointsForPosition(1.5, 12), undefined)
  assert.equal(calculatePointsForPosition(NaN, 12), undefined)
  assert.throws(() => calculatePointsForPosition(1, NaN), RangeError)
  assert.throws(() => calculatePointsForPosition(1, 12.5), RangeError)
})
