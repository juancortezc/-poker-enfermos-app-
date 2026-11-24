import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDaysToDateString,
  defaultBlindLevels,
  generateTournamentDates,
  getNextTuesday,
  parseToUTCNoon,
  rescheduleFrom,
  validateBlindLevels,
  validateTournamentForm,
  validateTuesdayDate,
} from '../src/index'

test('generateTournamentDates: martes cada 14 días a partir del dado', () => {
  const dates = generateTournamentDates(parseToUTCNoon('2026-12-01'), 12)
  assert.equal(dates.length, 12)
  assert.deepEqual(dates[0], { dateNumber: 1, scheduledDate: '2026-12-01' })
  assert.deepEqual(dates[1], { dateNumber: 2, scheduledDate: '2026-12-15' })
  assert.equal(dates[11].scheduledDate, '2027-05-04')
  for (const d of dates) assert.equal(parseToUTCNoon(d.scheduledDate).getUTCDay(), 2)
})

test('getNextTuesday es estrictamente posterior', () => {
  assert.equal(getNextTuesday(parseToUTCNoon('2026-12-01')).toISOString().slice(0, 10), '2026-12-08')
  assert.equal(getNextTuesday(parseToUTCNoon('2026-11-30')).toISOString().slice(0, 10), '2026-12-01')
})

test('rescheduleFrom recalcula solo desde el índice cambiado y conserva ids', () => {
  const base = generateTournamentDates(parseToUTCNoon('2026-12-01'), 4).map((d, i) => ({ ...d, id: 10 + i }))
  const moved = rescheduleFrom(base, 2, '2027-01-19')
  assert.deepEqual(
    moved.map((d) => d.scheduledDate),
    ['2026-12-01', '2026-12-15', '2027-01-19', '2027-02-02']
  )
  assert.deepEqual(moved.map((d) => d.id), [10, 11, 12, 13])
  assert.equal(base[2].scheduledDate, '2026-12-29', 'no muta el original')
})

test('addDaysToDateString cruza meses y años', () => {
  assert.equal(addDaysToDateString('2026-12-29', 7), '2027-01-05')
  assert.equal(addDaysToDateString('2027-01-05', -7), '2026-12-29')
})

test('validateTuesdayDate', () => {
  assert.deepEqual(validateTuesdayDate('2026-12-01'), { valid: true })
  assert.equal(validateTuesdayDate('2026-12-02').valid, false)
  assert.match(validateTuesdayDate('2026-12-02').message ?? '', /Miércoles/)
  assert.equal(validateTuesdayDate('basura').valid, false)
})

test('los blinds por defecto pasan la validación del formulario', () => {
  assert.deepEqual(validateBlindLevels(defaultBlindLevels()).filter((e) => e.type === 'error'), [])
  const r = validateTournamentForm({
    tournamentNumber: 31,
    gameDates: [],
    participantIds: ['a'],
    blindLevels: defaultBlindLevels(),
  })
  assert.equal(r.isValid, true)
})

test('blinds inválidos y exceso de participantes se bloquean', () => {
  const levels = defaultBlindLevels()
  levels[3] = { ...levels[3], bigBlind: levels[3].smallBlind }
  const r = validateTournamentForm({
    tournamentNumber: 31,
    gameDates: [],
    participantIds: Array.from({ length: 25 }, (_, i) => String(i)),
    blindLevels: levels,
  })
  assert.equal(r.isValid, false)
  assert.ok(r.errors.some((e) => e.field === 'participants'))
  assert.ok(r.errors.some((e) => e.field === 'blindLevel-3-bigBlind'))
})
