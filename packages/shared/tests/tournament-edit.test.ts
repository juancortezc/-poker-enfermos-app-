/**
 * Editar un torneo creado: jugadores inscritos y calendario. Lo jugado
 * (fechas en curso o completadas) no se toca; lo pendiente sí.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calendarFromPatch,
  checkTournamentRosterEditable,
  generateTournamentDates,
  nextCalendarDay,
  parseToUTCNoon,
  planCalendarEdit,
  planParticipantsEdit,
  playedDatesByPlayer,
  updateTournamentSchema,
  type CalendarDate,
  type EditResult,
} from '../src/index'

/** 12 martes desde 2027-01-05, ids 74..85 (como T31). */
function t31(statuses: Record<number, string> = {}): CalendarDate[] {
  return generateTournamentDates(parseToUTCNoon('2027-01-05'), 12).map((d, i) => ({
    id: 74 + i,
    dateNumber: d.dateNumber,
    scheduledDate: `${d.scheduledDate}T12:00:00.000Z`,
    status: statuses[d.dateNumber] ?? 'pending',
  }))
}

const asInput = (dates: CalendarDate[]) => dates.map((d) => ({ id: d.id, scheduledDate: d.scheduledDate.toString() }))

function errorOf<T>(r: EditResult<T>) {
  assert.equal(r.ok, false, 'esperaba un error')
  return (r as Extract<EditResult<T>, { ok: false }>).error
}
function valueOf<T>(r: EditResult<T>): T {
  if (!r.ok) assert.fail(`esperaba ok, llegó ${r.error.code}: ${r.error.message}`)
  return r.value
}

// --- Calendario -------------------------------------------------------------

test('calendario sin cambios: plan vacío', () => {
  const plan = valueOf(planCalendarEdit(t31(), asInput(t31())))
  assert.equal(plan.changed, false)
  assert.equal(plan.totalDates, 12)
})

test('mover una fecha pendiente a otro martes', () => {
  const next = asInput(t31())
  next[3].scheduledDate = '2027-02-23'
  const plan = valueOf(planCalendarEdit(t31(), next))
  assert.deepEqual(plan.updates, [{ id: 77, dateNumber: 4, scheduledDate: '2027-02-23' }])
  assert.deepEqual(plan.creates, [])
  assert.deepEqual(plan.removes, [])
})

test('agregar una fecha al final: número 13 y totalDates 13', () => {
  const next = [...asInput(t31()), { scheduledDate: nextCalendarDay(t31().map((d) => d.scheduledDate.toString())) }]
  const plan = valueOf(planCalendarEdit(t31(), next))
  assert.deepEqual(plan.creates, [{ dateNumber: 13, scheduledDate: '2027-06-22' }])
  assert.equal(plan.totalDates, 13)
})

test('quitar una fecha del medio renumera las siguientes', () => {
  const next = asInput(t31()).filter((d) => d.id !== 79) // fecha 6
  const plan = valueOf(planCalendarEdit(t31(), next))
  assert.deepEqual(plan.removes, [79])
  assert.equal(plan.totalDates, 11)
  assert.deepEqual(
    plan.updates.map((u) => [u.id, u.dateNumber]),
    [
      [80, 6],
      [81, 7],
      [82, 8],
      [83, 9],
      [84, 10],
      [85, 11],
    ]
  )
})

test('entre 10 y 15 fechas', () => {
  const nine = asInput(t31()).slice(0, 9)
  assert.equal(errorOf(planCalendarEdit(t31(), nine)).code, 'CALENDAR_SIZE')
  const ten = asInput(t31()).slice(0, 10)
  assert.equal(valueOf(planCalendarEdit(t31(), ten)).removes.length, 2)
})

test('las fechas van en orden, en martes y son del torneo', () => {
  const swapped = asInput(t31())
  ;[swapped[1], swapped[2]] = [swapped[2], swapped[1]]
  assert.equal(errorOf(planCalendarEdit(t31(), swapped)).code, 'CALENDAR_ORDER')

  const monday = asInput(t31())
  monday[5].scheduledDate = '2027-03-15'
  const e = errorOf(planCalendarEdit(t31(), monday))
  assert.equal(e.code, 'INVALID_DATE')
  assert.match(e.message, /Fecha 6: .*Lunes/)

  const foreign = asInput(t31())
  foreign[0] = { id: 999, scheduledDate: foreign[0].scheduledDate }
  assert.equal(errorOf(planCalendarEdit(t31(), foreign)).code, 'GAME_DATE_NOT_IN_TOURNAMENT')

  const dup = asInput(t31())
  dup[1] = { ...dup[0] }
  assert.equal(errorOf(planCalendarEdit(t31(), dup)).code, 'DUPLICATE_GAME_DATE')
})

test('fecha jugada o en curso: no se mueve, no se borra, nada se inserta antes', () => {
  const current = t31({ 1: 'completed', 2: 'in_progress' })

  const moved = asInput(current)
  moved[0].scheduledDate = '2027-01-12'
  const e1 = errorOf(planCalendarEdit(current, moved))
  assert.equal(e1.code, 'GAME_DATE_LOCKED')
  assert.equal(e1.kind, 'conflict')
  assert.match(e1.message, /fecha 1 ya se jugó: no se puede cambiar de día/)

  const removed = asInput(current).filter((d) => d.id !== 75)
  assert.match(errorOf(planCalendarEdit(current, removed)).message, /fecha 2 está en curso: no se puede borrar/)

  const inserted = asInput(current)
  inserted.splice(0, 0, { id: undefined as unknown as number, scheduledDate: '2026-12-29' })
  assert.equal(errorOf(planCalendarEdit(current, inserted)).code, 'GAME_DATE_LOCKED')
})

test('con fechas jugadas, las pendientes siguen editables (mover, agregar, quitar)', () => {
  const current = t31({ 1: 'completed', 2: 'completed', 3: 'CREATED' })
  const next = asInput(current).filter((d) => d.id !== 84) // quita la 11
  next[2].scheduledDate = '2027-02-09' // la 3 (CREATED) se corre una semana
  next.push({ id: undefined as unknown as number, scheduledDate: '2027-06-22' })
  const plan = valueOf(planCalendarEdit(current, next))
  assert.deepEqual(plan.removes, [84])
  assert.deepEqual(plan.updates[0], { id: 76, dateNumber: 3, scheduledDate: '2027-02-09' })
  assert.deepEqual(plan.updates.at(-1), { id: 85, dateNumber: 11, scheduledDate: '2027-06-08' })
  assert.deepEqual(plan.creates, [{ dateNumber: 12, scheduledDate: '2027-06-22' }])
  assert.equal(plan.updates.some((u) => u.id === 74 || u.id === 75), false)
})

test('fecha cancelada también queda fija', () => {
  const current = t31({ 4: 'cancelled' })
  const next = asInput(current).filter((d) => d.id !== 77)
  assert.match(errorOf(planCalendarEdit(current, next)).message, /fecha 4 está cancelada/)
})

test('formato viejo (gameDates por id) se convierte al calendario completo', () => {
  const current = t31({ 1: 'completed' })
  const cal = valueOf(calendarFromPatch(current, [{ id: 85, scheduledDate: '2027-06-15' }]))
  assert.equal(cal.length, 12)
  assert.equal(cal[11].scheduledDate, '2027-06-15')
  assert.equal(valueOf(planCalendarEdit(current, cal)).updates.length, 1)
  // Mandar la fecha jugada sin cambios no es error; cambiarla sí.
  assert.equal(valueOf(planCalendarEdit(current, valueOf(calendarFromPatch(current, [{ id: 74, scheduledDate: '2027-01-05' }])))).changed, false)
  const touched = valueOf(calendarFromPatch(current, [{ id: 74, scheduledDate: '2027-01-12' }]))
  assert.equal(errorOf(planCalendarEdit(current, touched)).code, 'GAME_DATE_LOCKED')
  assert.equal(errorOf(calendarFromPatch(current, [{ id: 1, scheduledDate: '2027-01-12' }])).code, 'GAME_DATE_NOT_IN_TOURNAMENT')
})

test('torneo finalizado: ni jugadores ni calendario', () => {
  assert.equal(errorOf(checkTournamentRosterEditable({ number: 30, status: 'FINALIZADO' })).code, 'TOURNAMENT_FINISHED')
  assert.equal(checkTournamentRosterEditable({ number: 31, status: 'ACTIVO' }).ok, true)
})

// --- Jugadores --------------------------------------------------------------

const players = [
  { id: 'a', name: 'Ana Uno', role: 'Enfermo', isActive: true },
  { id: 'b', name: 'Beto Dos', role: 'Comision', isActive: true },
  { id: 'c', name: 'Caro Tres', role: 'Enfermo', isActive: true },
  { id: 'g', name: 'Gus Invitado', role: 'Invitado', isActive: true },
  { id: 'x', name: 'Xavi Inactivo', role: 'Enfermo', isActive: false },
]

test('playedDatesByPlayer: solo fechas en curso o completadas, más eliminaciones', () => {
  const played = playedDatesByPlayer(
    [
      { dateNumber: 1, status: 'completed', playerIds: ['a', 'b'] },
      { dateNumber: 2, status: 'CREATED', playerIds: ['c'] },
      { dateNumber: 3, status: 'in_progress', playerIds: ['a'] },
    ],
    [{ dateNumber: 1, playerIds: ['c', 'a'] }]
  )
  assert.deepEqual(played, { a: [1, 3], b: [1], c: [1] })
})

test('inscribir y quitar a quien no jugó', () => {
  const plan = valueOf(planParticipantsEdit({ current: ['a', 'b'], next: ['a', 'c'], played: {}, players }))
  assert.deepEqual(plan.add, ['c'])
  assert.deepEqual(plan.remove, ['b'])
  assert.deepEqual(plan.participantIds, ['a', 'c'])
})

test('inscripción tardía: se agrega aunque ya haya fechas jugadas', () => {
  const plan = valueOf(planParticipantsEdit({ current: ['a', 'b'], next: ['a', 'b', 'c'], played: { a: [1], b: [1] }, players }))
  assert.deepEqual(plan.add, ['c'])
})

test('no se quita a quien ya jugó una fecha del torneo', () => {
  const e = errorOf(planParticipantsEdit({ current: ['a', 'b'], next: ['b'], played: { a: [1, 3] }, players }))
  assert.equal(e.code, 'PARTICIPANT_HAS_PLAYED')
  assert.equal(e.kind, 'conflict')
  assert.equal(e.message, 'No se puede quitar del torneo a quien ya jugó: Ana Uno (fechas 1, 3).')
})

test('invitados, inactivos, desconocidos y lista vacía', () => {
  assert.equal(errorOf(planParticipantsEdit({ current: ['a'], next: ['a', 'g'], played: {}, players })).code, 'GUEST_NOT_ALLOWED')
  assert.equal(errorOf(planParticipantsEdit({ current: ['a'], next: ['a', 'x'], played: {}, players })).code, 'PLAYER_INACTIVE')
  assert.equal(errorOf(planParticipantsEdit({ current: ['a'], next: ['a', 'zz'], played: {}, players })).code, 'PLAYER_NOT_FOUND')
  assert.equal(errorOf(planParticipantsEdit({ current: ['a'], next: [], played: {}, players })).code, 'PARTICIPANTS_EMPTY')
  // Un inactivo que ya estaba inscrito se puede quedar.
  assert.equal(valueOf(planParticipantsEdit({ current: ['a', 'x'], next: ['a', 'x'], played: {}, players })).changed, false)
})

// --- Esquema ----------------------------------------------------------------

test('updateTournamentSchema: calendar de 10 a 15 y no junto con gameDates', () => {
  const cal = asInput(t31())
  assert.equal(updateTournamentSchema.safeParse({ calendar: cal }).success, true)
  assert.equal(updateTournamentSchema.safeParse({ calendar: [...cal, { scheduledDate: '2027-06-22' }] }).success, true)
  assert.equal(updateTournamentSchema.safeParse({ calendar: cal.slice(0, 9) }).success, false)
  assert.equal(updateTournamentSchema.safeParse({ calendar: cal, gameDates: [{ id: 74, scheduledDate: '2027-01-05' }] }).success, false)
  assert.equal(updateTournamentSchema.safeParse({ participantIds: [] }).success, false)
})
