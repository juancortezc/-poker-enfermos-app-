/**
 * H6: el VO Points de /api/eliminations ahora delega en @poker/shared.
 * Esta prueba fija que los resultados NO cambian:
 *
 * - `legacyPoints` es copia literal del algoritmo que tenía Points.ts antes
 *   de delegar (commit 00abfb4). Se compara para 1..30 jugadores y todas las
 *   posiciones, incluidos los casos raros (≤9 y >24), para que nada cambie
 *   hasta que el usuario apruebe la tabla de 9 o menos.
 * - En 10..24 jugadores además se exige igualdad exacta con
 *   `calculatePointsForPosition`, que es la fuente única.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculatePointsForPosition, getPointsDistribution } from '@poker/shared'
import { Points } from '../src/domain/elimination/value-objects/Points'
import { PointsCalculator } from '../src/domain/elimination/services/PointsCalculator'

function legacyBuild(totalPlayers: number): number[] {
  const a = new Array(totalPlayers)
  a[totalPlayers - 1] = 1
  for (let i = totalPlayers - 2; i >= 9; i--) a[i] = a[i + 1] + 1
  if (totalPlayers >= 9) a[8] = a[9] + 2
  for (let i = 7; i >= 3; i--) a[i] = a[i + 1] + 1
  for (let i = 2; i >= 0; i--) a[i] = a[i + 1] + 3
  return a
}

function legacyPoints(position: number, totalPlayers: number): number {
  const players = Math.max(9, Math.min(24, totalPlayers))
  if (position < 1 || position > players) return 0
  return legacyBuild(players)[position - 1]
}

test('Points.calculate es idéntico al algoritmo anterior (1..30 jugadores, todas las posiciones)', () => {
  for (let total = 1; total <= 30; total++) {
    for (let position = -1; position <= total + 2; position++) {
      assert.equal(
        Points.calculate(position, total).value,
        legacyPoints(position, total),
        `posición ${position} con ${total} jugadores`
      )
    }
  }
})

test('10..24 jugadores: Points.calculate === calculatePointsForPosition de @poker/shared', () => {
  for (let total = 10; total <= 24; total++) {
    for (let position = 0; position <= total + 1; position++) {
      assert.equal(
        Points.calculate(position, total).value,
        calculatePointsForPosition(position, total),
        `posición ${position} con ${total} jugadores`
      )
    }
    assert.deepEqual(Points.getDistribution(total), getPointsDistribution(total))
    assert.deepEqual(PointsCalculator.getDistribution(total), legacyBuild(total))
  }
})

test('getDistribution conserva el clamp anterior fuera de 10..24', () => {
  for (const total of [1, 5, 8, 9, 25, 30]) {
    assert.deepEqual(Points.getDistribution(total), legacyBuild(Math.max(9, Math.min(24, total))))
  }
})

test('tabla de puntos completa sin cambios', () => {
  const table = PointsCalculator.getPointsTable()
  for (let total = 9; total <= 24; total++) {
    assert.deepEqual(table[total], legacyBuild(total))
  }
})
