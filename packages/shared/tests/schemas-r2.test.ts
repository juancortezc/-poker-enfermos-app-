import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  registerEliminationSchema,
  updateEliminationSchema,
  timerControlSchema,
  timerParamsSchema,
  calendarDraftSchema,
  createTournamentSchema,
  updateTournamentSchema,
  tournamentListQuerySchema,
  createTournamentDateSchema,
  completeTournamentSchema,
  createGameDateSchema,
  updateGameDateSchema,
  gameDatePlayerSchema,
  idParamsSchema,
} from '../src/index'

test('eliminacion: alta valida, eliminador vacio o null = null', () => {
  const base = { gameDateId: 3, position: 10, eliminatedPlayerId: 'p1' }
  assert.deepEqual(registerEliminationSchema.parse({ ...base, eliminatorPlayerId: 'p2' }), { ...base, eliminatorPlayerId: 'p2' })
  assert.equal(registerEliminationSchema.parse({ ...base, eliminatorPlayerId: '' }).eliminatorPlayerId, null)
  assert.equal(registerEliminationSchema.parse({ ...base, eliminatorPlayerId: null }).eliminatorPlayerId, null)
  assert.equal(registerEliminationSchema.parse(base).eliminatorPlayerId, null)
})

test('eliminacion: alta invalida', () => {
  const base = { gameDateId: 3, position: 10, eliminatedPlayerId: 'p1' }
  for (const bad of [
    { ...base, position: '8' },
    { ...base, position: 7.5 },
    { ...base, position: 0 },
    { ...base, gameDateId: -1 },
    { ...base, eliminatedPlayerId: '' },
    { ...base, eliminatedPlayerId: 'x'.repeat(65) },
    { gameDateId: 3, position: 10 },
  ]) {
    assert.equal(registerEliminationSchema.safeParse(bad).success, false, JSON.stringify(bad))
  }
})

test('eliminacion: edicion acepta los nombres viejos y rechaza posicion/puntos', () => {
  assert.deepEqual(updateEliminationSchema.parse({ eliminatedId: 'a', eliminatorId: 'b' }), {
    eliminatedPlayerId: 'a',
    eliminatorPlayerId: 'b',
  })
  assert.deepEqual(updateEliminationSchema.parse({ eliminatedPlayerId: 'a', eliminatorPlayerId: null }), {
    eliminatedPlayerId: 'a',
    eliminatorPlayerId: undefined,
  })
  const r = updateEliminationSchema.safeParse({ eliminatedPlayerId: 'a', position: 3 })
  assert.equal(r.success, false)
  assert.equal(r.error?.issues[0].message, 'No se puede cambiar la posición ni los puntos')
  assert.equal(updateEliminationSchema.safeParse({ points: 5 }).success, false)
})

test('timer: acciones validas e invalidas', () => {
  for (const action of ['start', 'reset', 'pause', 'resume', 'restart-level', 'advance']) {
    assert.equal(timerControlSchema.parse({ action }).action, action)
  }
  const r = timerControlSchema.safeParse({ action: 'explode' })
  assert.equal(r.success, false)
  assert.match(r.error!.issues[0].message, /Acción inválida/)
  assert.equal(timerControlSchema.safeParse({}).success, false)
  assert.equal(timerParamsSchema.parse({ gameDateId: '12' }).gameDateId, 12)
  assert.equal(timerParamsSchema.safeParse({ gameDateId: 'abc' }).success, false)
})

test('params: id numerico', () => {
  assert.equal(idParamsSchema.parse({ id: '7' }).id, 7)
  for (const id of ['0', '-1', '1.5', 'x', '']) assert.equal(idParamsSchema.safeParse({ id }).success, false, id)
})

const draftDates = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ dateNumber: i + 1, scheduledDate: `2026-01-${String(i + 1).padStart(2, '0')}` }))

test('calendario: 10 a 15 fechas numeradas en orden', () => {
  assert.equal(calendarDraftSchema.safeParse({ gameDates: draftDates(12) }).success, true)
  assert.equal(calendarDraftSchema.safeParse({ gameDates: draftDates(9) }).success, false)
  assert.equal(calendarDraftSchema.safeParse({ gameDates: draftDates(16) }).success, false)
  const desordenadas = draftDates(12)
  desordenadas[3].dateNumber = 9
  assert.equal(calendarDraftSchema.safeParse({ gameDates: desordenadas }).success, false)
  const malaFecha = draftDates(12)
  malaFecha[0].scheduledDate = 'no-es-fecha'
  assert.equal(calendarDraftSchema.safeParse({ gameDates: malaFecha }).success, false)
})

test('torneo: alta valida con defaults', () => {
  const body = {
    number: 31,
    gameDates: Array.from({ length: 12 }, () => ({ scheduledDate: '2026-03-03' })),
    participantIds: ['p1', 'p2'],
  }
  const r = createTournamentSchema.parse(body)
  assert.equal(r.totalDates, 12)
  assert.equal(r.datesToEliminate, 2)
})

test('torneo: alta invalida', () => {
  const ok = {
    number: 31,
    gameDates: Array.from({ length: 12 }, () => ({ scheduledDate: '2026-03-03' })),
    participantIds: ['p1'],
  }
  for (const bad of [
    { ...ok, number: 0 },
    { ...ok, number: '31' },
    { ...ok, participantIds: [] },
    { ...ok, totalDates: 16 },
    { ...ok, datesToEliminate: 4 },
    { ...ok, totalDates: 10 }, // 12 fechas programadas != 10
  ]) {
    assert.equal(createTournamentSchema.safeParse(bad).success, false, JSON.stringify(bad).slice(0, 60))
  }
})

test('torneo: edicion, filtro de estado y fechas', () => {
  assert.equal(updateTournamentSchema.parse({ name: '  T31 ' }).name, 'T31')
  assert.equal(updateTournamentSchema.safeParse({ status: 'CERRADO' }).success, false)
  assert.equal(updateTournamentSchema.safeParse({ gameDates: [{ scheduledDate: '2026-01-01' }] }).success, false) // falta id
  assert.equal(tournamentListQuerySchema.parse({}).status, undefined)
  assert.equal(tournamentListQuerySchema.parse({ status: 'ACTIVO' }).status, 'ACTIVO')
  assert.equal(tournamentListQuerySchema.safeParse({ status: 'activo' }).success, false)
  const d = createTournamentDateSchema.parse({ dateNumber: 3, scheduledDate: '2026-02-10' })
  assert.equal(d.playersMin, 9)
  assert.equal(d.playersMax, 24)
  assert.equal(createTournamentDateSchema.safeParse({ dateNumber: 13, scheduledDate: '2026-02-10' }).success, false)
})

test('torneo: completar', () => {
  assert.equal(completeTournamentSchema.parse({ action: 'complete_tournament' }).action, 'complete_tournament')
  assert.equal(completeTournamentSchema.safeParse({ action: 'modify_date' }).success, false) // falta endDate
  assert.equal(completeTournamentSchema.safeParse({ action: 'modify_date', endDate: '2026-12-01' }).success, true)
  assert.equal(completeTournamentSchema.safeParse({ action: 'borrar' }).success, false)
})

test('fecha: alta acepta ids como numero o texto', () => {
  const r = createGameDateSchema.parse({
    tournamentId: '3',
    dateNumber: 4,
    scheduledDate: '2026-02-10T12:00:00.000Z',
    playerIds: ['p1'],
  })
  assert.equal(r.tournamentId, 3)
  assert.deepEqual(r.guestIds, [])
  assert.equal(createGameDateSchema.safeParse({ tournamentId: 3, dateNumber: 4, scheduledDate: '2026-02-10', playerIds: [] }).success, false)
  assert.equal(createGameDateSchema.safeParse({ tournamentId: 'x', dateNumber: 4, scheduledDate: '2026-02-10', playerIds: ['p'] }).success, false)
})

test('fecha: acciones y jugadores', () => {
  assert.equal(updateGameDateSchema.parse({ action: 'start' }).action, 'start')
  assert.equal(updateGameDateSchema.safeParse({ action: 'finish' }).success, false)
  assert.equal(updateGameDateSchema.safeParse({ action: 'update', playerIds: ['a'], scheduledDate: '2026-02-10' }).success, true)
  assert.equal(gameDatePlayerSchema.safeParse({ playerId: 'p1' }).success, true)
  assert.equal(gameDatePlayerSchema.safeParse({}).success, false)
})
