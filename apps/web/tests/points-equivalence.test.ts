/**
 * H6: el VO Points de /api/eliminations delega en @poker/shared.
 *
 * - `legacyPoints` es copia literal del algoritmo que tenía Points.ts antes
 *   de delegar (commit 00abfb4). De 10 a 24 jugadores el resultado tiene que
 *   ser EXACTAMENTE el mismo (y >24 conserva el tope de 24).
 * - Con 9 o menos rige la tabla aprobada por la Comisión, sin recorte a 9.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculatePointsForPosition, getPointsDistribution } from '@poker/shared'
import { Points } from '../src/domain/elimination/value-objects/Points'
import { PointsCalculator } from '../src/domain/elimination/services/PointsCalculator'
import { Position } from '../src/domain/elimination/value-objects/Position'

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

const TABLA_CHICA: Record<number, number[]> = {
  9: [15, 12, 9, 6, 5, 4, 3, 2, 1],
  8: [14, 11, 8, 5, 4, 3, 2, 1],
  7: [13, 10, 7, 4, 3, 2, 1],
  6: [12, 9, 6, 3, 2, 1],
  5: [11, 8, 5, 2, 1],
  4: [10, 7, 4, 1],
  3: [7, 4, 1],
  2: [4, 1],
}

test('10..30 jugadores: Points.calculate idéntico al algoritmo anterior', () => {
  for (let total = 10; total <= 30; total++) {
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

test('9 jugadores o menos: tabla aprobada, sin recorte a 9', () => {
  for (const [n, tabla] of Object.entries(TABLA_CHICA)) {
    const total = Number(n)
    assert.deepEqual(Points.getDistribution(total), tabla, `${total} jugadores`)
    tabla.forEach((p, i) => assert.equal(Points.calculate(i + 1, total).value, p))
    assert.equal(Points.calculate(total + 1, total).value, 0, `fuera de rango con ${total}`)
    assert.throws(() => Position.create(total + 1, total))
    assert.equal(Position.create(total, total).value, total)
  }
})

test('getDistribution conserva el tope de 24', () => {
  for (const total of [25, 30]) {
    assert.deepEqual(Points.getDistribution(total), legacyBuild(24))
  }
})

test('tabla de puntos completa', () => {
  const table = PointsCalculator.getPointsTable()
  assert.deepEqual(table[9], TABLA_CHICA[9])
  for (let total = 10; total <= 24; total++) {
    assert.deepEqual(table[total], legacyBuild(total))
  }
})
