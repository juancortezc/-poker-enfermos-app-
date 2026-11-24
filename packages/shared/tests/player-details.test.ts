import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPlayerTournamentDetails,
  calculateRankingEvolution,
  buildSeasonIcs,
  googleCalendarUrl,
  isBirthdayNearDate,
  parseBirthMonthDay,
  type PlayerRanking,
} from '../src/index'

function jugador(id: string, pointsByDate: Record<number, number>, position: number): PlayerRanking {
  const total = Object.values(pointsByDate).reduce((a, b) => a + b, 0)
  return {
    position,
    playerId: id,
    playerName: id,
    totalPoints: total,
    datesPlayed: Object.keys(pointsByDate).length,
    pointsByDate,
    trend: 'same',
    positionsChanged: 0,
    eliminasActive: false,
    firstPlaces: 0,
    secondPlaces: 0,
    thirdPlaces: 0,
    lastPlaces: 0,
    secondToLastPlaces: 0,
    absences: 0,
  }
}

const elim = (id: string, position: number, points: number) => ({
  eliminatedPlayer: { id, firstName: id, lastName: 'X' },
  eliminatorPlayer: { firstName: 'Z', lastName: 'Y' },
  position,
  points,
})

const ranking = {
  tournament: { id: 1, name: 'T', number: 30, totalDates: 4, datesToEliminate: 1, completedDates: 2 },
  rankings: [jugador('a', { 1: 10, 2: 20 }, 1), jugador('b', { 1: 15, 2: 5 }, 2), jugador('c', { 1: 1, 2: 0 }, 3)],
}

test('buildPlayerTournamentDetails: posicion, ausencia y mejor resultado', () => {
  const d = buildPlayerTournamentDetails({
    playerId: 'c',
    ranking,
    gameDates: [
      { id: 11, dateNumber: 1, status: 'completed', playerIds: ['a', 'b', 'c'] },
      { id: 12, dateNumber: 2, status: 'completed', playerIds: ['a', 'b'] },
      { id: 13, dateNumber: 3, status: 'pending', playerIds: [] },
    ],
    datesWithEliminations: [
      { id: 11, eliminations: [elim('c', 3, 1), elim('a', 2, 10), elim('b', 1, 15)] },
      { id: 12, eliminations: [elim('b', 2, 5), elim('a', 1, 20)] },
    ],
    player: { id: 'c', firstName: 'C', lastName: 'Z' },
  })
  assert.equal(d.currentStats.position, 3)
  assert.equal(d.datePerformance[0].eliminationPosition, 3)
  assert.equal(d.datePerformance[1].isAbsent, true)
  assert.equal(d.bestResult, '3° lugar')
  assert.deepEqual(d.player.aliases, [])
})

test('buildPlayerTournamentDetails: lanza si no esta en el ranking', () => {
  assert.throws(() =>
    buildPlayerTournamentDetails({
      playerId: 'zz',
      ranking,
      gameDates: [],
      datesWithEliminations: [],
      player: { id: 'zz', firstName: 'Z', lastName: 'Z' },
    })
  )
})

test('calculateRankingEvolution: aplica el ELIMINA desde la mitad', () => {
  const evo = calculateRankingEvolution(ranking.rankings[1].pointsByDate, ranking.rankings, 'b', 4, 1)
  // F1: b lidera con 15. F2 (umbral 2 fechas): b descarta 5 → 15; a descarta 10 → 20.
  assert.deepEqual(evo, [
    { dateNumber: 1, position: 1, points: 15 },
    { dateNumber: 2, position: 2, points: 15 },
  ])
})

test('cumpleaños: parseo y cercania', () => {
  assert.deepEqual(parseBirthMonthDay('1980-03-15'), { month: 3, day: 15 })
  assert.deepEqual(parseBirthMonthDay('03-15'), { month: 3, day: 15 })
  assert.equal(parseBirthMonthDay('x'), null)
  assert.equal(isBirthdayNearDate('1980-03-15', new Date(2026, 2, 16)), true)
  assert.equal(isBirthdayNearDate('1980-03-15', new Date(2026, 2, 18)), false)
})

test('ics: un VEVENT por fecha, con texto escapado', () => {
  const ics = buildSeasonIcs(
    [{ uid: 'g1', title: 'Fecha 1, T30', start: '2026-01-01T00:20:00.000Z' }],
    new Date('2025-12-01T00:00:00.000Z')
  )
  assert.match(ics, /BEGIN:VCALENDAR/)
  assert.match(ics, /DTSTART:20260101T002000Z/)
  assert.match(ics, /DTEND:20260101T042000Z/)
  assert.match(ics, /SUMMARY:Fecha 1\\, T30/)
  assert.equal(ics.split('BEGIN:VEVENT').length - 1, 1)
  assert.match(googleCalendarUrl(3, '2026-01-01T00:20:00.000Z'), /Fecha%203&dates=20260101T002000Z\/20260101T042000Z$/)
})
