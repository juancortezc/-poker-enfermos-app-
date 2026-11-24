import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  compareByTiebreak,
  scoreOf,
  eliminatedDateNumbers,
  nightlyPosition,
  averageNightlyPosition,
  averagePointsPerDate,
  playedDateNumbers,
  SCORE_LABELS,
  type PlayerRanking,
} from '../src/index'

function jugador(id: string, o: Partial<PlayerRanking> = {}): PlayerRanking {
  return {
    position: 0,
    playerId: id,
    playerName: id,
    totalPoints: 0,
    datesPlayed: 0,
    pointsByDate: {},
    trend: 'same',
    positionsChanged: 0,
    eliminasActive: true,
    firstPlaces: 0,
    secondPlaces: 0,
    thirdPlaces: 0,
    lastPlaces: 0,
    secondToLastPlaces: 0,
    absences: 0,
    ...o,
  }
}

const orden = (xs: PlayerRanking[]) => [...xs].sort(compareByTiebreak).map((p) => p.playerId)

test('desempate: cada criterio en su orden', () => {
  const base = { finalScore: 50, totalPoints: 60 }
  // 1. finalScore manda sobre todo lo demas
  assert.deepEqual(orden([jugador('a', { ...base, firstPlaces: 9 }), jugador('b', { ...base, finalScore: 51 })]), ['b', 'a'])
  // 2. victorias antes que segundos
  assert.deepEqual(orden([jugador('a', { ...base, secondPlaces: 5 }), jugador('b', { ...base, firstPlaces: 1 })]), ['b', 'a'])
  // 3. segundos antes que terceros
  assert.deepEqual(orden([jugador('a', { ...base, thirdPlaces: 5 }), jugador('b', { ...base, secondPlaces: 1 })]), ['b', 'a'])
  // 4. terceros antes que ultimos
  assert.deepEqual(orden([jugador('a', { ...base, thirdPlaces: 0 }), jugador('b', { ...base, thirdPlaces: 1, lastPlaces: 3 })]), ['b', 'a'])
  // 5. MENOS ultimos (7/2) es mejor
  assert.deepEqual(orden([jugador('a', { ...base, lastPlaces: 2 }), jugador('b', { ...base, lastPlaces: 1 })]), ['b', 'a'])
  // 6. MENOS penultimos es mejor, y pesa mas que el acumulado
  assert.deepEqual(orden([jugador('a', { ...base, secondToLastPlaces: 1, totalPoints: 99 }), jugador('b', { ...base })]), ['b', 'a'])
  // 7. mas acumulado
  assert.deepEqual(orden([jugador('a', { ...base }), jugador('b', { ...base, totalPoints: 61 })]), ['b', 'a'])
  // 8. alfabetico como ultimo recurso
  assert.deepEqual(orden([jugador('Zoe', base), jugador('Ana', base)]), ['Ana', 'Zoe'])
})

test('finalScore 0 es un puntaje real, no se reemplaza por el acumulado', () => {
  const a = jugador('a', { finalScore: 0, totalPoints: 40 })
  const b = jugador('b', { finalScore: 1, totalPoints: 1 })
  assert.equal(scoreOf(a), 0)
  assert.deepEqual(orden([a, b]), ['b', 'a'])
})

test('sin finalScore se usa el acumulado', () => {
  assert.equal(scoreOf(jugador('a', { totalPoints: 7 })), 7)
  assert.deepEqual(orden([jugador('a', { totalPoints: 7 }), jugador('b', { finalScore: 8, totalPoints: 1 })]), ['b', 'a'])
})

test('comparador consistente: antisimetrico y empate total = 0', () => {
  const a = jugador('x', { finalScore: 10, totalPoints: 10 })
  const b = jugador('x', { finalScore: 10, totalPoints: 10 })
  assert.equal(compareByTiebreak(a, b), 0)
  const c = jugador('y', { finalScore: 10, totalPoints: 10, firstPlaces: 1 })
  assert.equal(Math.sign(compareByTiebreak(a, c)), -Math.sign(compareByTiebreak(c, a)))
  assert.deepEqual(orden([]), [])
})

test('ELIMINA: descarta las peores, en empate la fecha mas antigua', () => {
  const p = jugador('a', { pointsByDate: { 1: 5, 2: 3, 3: 3, 4: 10, 5: 0 } })
  assert.deepEqual([...eliminatedDateNumbers(p, 2)].sort((x, y) => x - y), [2, 5])
  assert.deepEqual([...eliminatedDateNumbers(p, 1)], [5])
  assert.deepEqual([...eliminatedDateNumbers(p, 3)].sort((x, y) => x - y), [2, 3, 5])
  const empate = jugador('b', { pointsByDate: { 7: 4, 3: 4, 5: 4 } })
  assert.deepEqual([...eliminatedDateNumbers(empate, 1)], [3])
})

test('ELIMINA: sin umbral, 0 o negativo, o mas que fechas', () => {
  const p = jugador('a', { pointsByDate: { 1: 5, 2: 3 } })
  assert.equal(eliminatedDateNumbers(p, 0).size, 0)
  assert.equal(eliminatedDateNumbers(p, -1).size, 0)
  assert.equal(eliminatedDateNumbers({ ...p, eliminasActive: false }, 2).size, 0)
  assert.deepEqual([...eliminatedDateNumbers(p, 10)].sort(), [1, 2])
  assert.equal(eliminatedDateNumbers(jugador('z'), 2).size, 0)
})

test('posicion nocturna y promedios', () => {
  const r = [
    jugador('a', { pointsByDate: { 1: 20, 2: 0, 3: 5 } }),
    jugador('b', { pointsByDate: { 1: 10, 2: 8 } }),
    jugador('c', { pointsByDate: { 1: 1, 3: 9 } }),
  ]
  assert.deepEqual(playedDateNumbers(r), [1, 2, 3])
  assert.equal(nightlyPosition(r, 1, 'a'), 1)
  assert.equal(nightlyPosition(r, 1, 'c'), 3)
  assert.equal(nightlyPosition(r, 2, 'a'), null) // 0 = ausencia
  assert.equal(nightlyPosition(r, 3, 'b'), null) // no jugo
  assert.equal(nightlyPosition(r, 99, 'a'), null)
  assert.equal(nightlyPosition(r, 1, 'nadie'), null)
  assert.equal(averageNightlyPosition(r, 'a'), (1 + 2) / 2)
  assert.equal(averageNightlyPosition(r, 'nadie'), null)
  assert.equal(averageNightlyPosition([jugador('q', { pointsByDate: { 1: 0 } })], 'q'), null)
  assert.equal(averagePointsPerDate(r[0]), 12.5)
  assert.equal(averagePointsPerDate(jugador('v')), 0)
  assert.deepEqual(playedDateNumbers([]), [])
})

test('etiquetas de puntaje', () => {
  assert.deepEqual(SCORE_LABELS, { points: 'PUNTOS', pointsShort: 'PTS', accumulated: 'ACUM.', accumulatedLong: 'Acumulado' })
})
