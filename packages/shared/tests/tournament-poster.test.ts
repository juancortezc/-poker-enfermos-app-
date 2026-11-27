import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDayMonth,
  nextDateLine,
  registeredPlayersLabel,
  toRoman,
  tournamentHasResults,
  tournamentPoster,
} from '../src/index'

const fila = (extra: Partial<{ datesPlayed: number; pointsByDate: Record<number, number>; liveProjection: object }> = {}) => ({
  datesPlayed: 0,
  pointsByDate: {},
  ...extra,
})

test('un torneo recien creado (todos en 0, sin fechas) no tiene resultados', () => {
  assert.equal(tournamentHasResults([]), false)
  assert.equal(tournamentHasResults([fila(), fila(), fila()]), false)
})

test('con una fecha jugada, o una en curso, si tiene', () => {
  assert.equal(tournamentHasResults([fila(), fila({ datesPlayed: 1, pointsByDate: { 1: 0 } })]), true)
  // Un 0 real en la fecha 1 cuenta: jugo y salio ultimo.
  assert.equal(tournamentHasResults([fila({ pointsByDate: { 1: 0 } })]), true)
  assert.equal(tournamentHasResults([fila({ liveProjection: { dateNumber: 1 } })]), true)
})

test('afiche por numero de torneo, con respaldo null', () => {
  assert.equal(tournamentPoster(31)?.file, 'torneo-31')
  assert.equal(tournamentPoster(32), null)
})

test('numeros romanos de los afiches', () => {
  assert.equal(toRoman(31), 'XXXI')
  assert.equal(toRoman(29), 'XXIX')
  assert.equal(toRoman(40), 'XL')
  assert.equal(toRoman(0), '0')
})

test('la proxima fecha se lee en dia de calendario (mediodia UTC)', () => {
  assert.equal(formatDayMonth('2027-01-05T12:00:00.000Z'), '5 de enero')
  assert.equal(formatDayMonth('no es fecha'), null)
  assert.equal(nextDateLine({ dateNumber: 1, scheduledDate: '2027-01-05T12:00:00.000Z' }), 'Fecha 1 · 5 de enero')
  assert.equal(nextDateLine({ dateNumber: 3, scheduledDate: null }), 'Fecha 3 · por definir')
  assert.equal(nextDateLine(null), null)
})

test('inscritos en singular y plural', () => {
  assert.equal(registeredPlayersLabel(11), '11 inscritos')
  assert.equal(registeredPlayersLabel(1), '1 inscrito')
})
