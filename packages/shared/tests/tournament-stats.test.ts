import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateEliminationPairs,
  buildTournamentReport,
  computeStandings,
  computeTournamentAwardsData,
  nightSieteDos,
  tournamentSieteDos,
  REPORT_SHEETS,
  type TSGameDate,
  type TSInput,
} from '../src/index'

/**
 * Torneo de juguete: 4 inscritos (A, B, C, D) y un invitado (G), 3 fechas
 * jugadas de 4, ELIMINA 1 (se descarta la peor desde la 2ª fecha).
 *
 *   F1 (5): A 11, B 8, G 5, C 2, D 1   — A saca a B y G, B a C, C a D
 *   F2 (4): B 10, C 7, A 4, D 1        — C saca a D, B a A y C
 *   F3 (3): C 7, A 4, B 1 (D falta)    — C saca a B y A
 */
const e = (eliminatedPlayerId: string, eliminatorPlayerId: string, position: number, points: number) =>
  ({ eliminatedPlayerId, eliminatorPlayerId, position, points })

const dates: TSGameDate[] = [
  {
    dateNumber: 1, scheduledDate: '2026-01-06', playerIds: ['A', 'B', 'C', 'D', 'G'],
    eliminations: [e('A', 'A', 1, 11), e('B', 'A', 2, 8), e('G', 'A', 3, 5), e('C', 'B', 4, 2), e('D', 'C', 5, 1)],
  },
  {
    dateNumber: 2, scheduledDate: '2026-01-20', playerIds: ['A', 'B', 'C', 'D'],
    eliminations: [e('B', 'B', 1, 10), e('C', 'B', 2, 7), e('A', 'B', 3, 4), e('D', 'C', 4, 1)],
  },
  {
    dateNumber: 3, scheduledDate: '2026-02-03', playerIds: ['A', 'B', 'C'],
    eliminations: [e('C', 'C', 1, 7), e('A', 'C', 2, 4), e('B', 'C', 3, 1)],
  },
]

const input: TSInput = {
  tournament: { number: 99, name: 'Torneo 99', status: 'FINALIZADO', totalDates: 4, datesToEliminate: 1 },
  players: [
    { id: 'A', name: 'Ana', role: 'Enfermo' },
    { id: 'B', name: 'Beto', role: 'Comision' },
    { id: 'C', name: 'Ceci', role: 'Enfermo' },
    { id: 'D', name: 'Dani', role: 'Enfermo' },
    { id: 'G', name: 'Invitado 1', role: 'Invitado' },
  ],
  registeredIds: ['A', 'B', 'C', 'D'],
  // Desordenadas a proposito: el reporte las ordena.
  gameDates: [dates[2], dates[0], dates[1]],
}

test('computeStandings: ACUM., ELIMINA, faltas y orden', () => {
  const { rankings } = computeStandings(
    input.registeredIds.map(id => ({ id, name: id })),
    dates,
    { totalDates: 4, datesToEliminate: 1 }
  )
  assert.deepEqual(rankings.map(r => [r.playerId, r.position, r.totalPoints, r.finalScore]), [
    ['B', 1, 19, 18],
    ['A', 2, 19, 15],
    ['C', 3, 16, 14],
    ['D', 4, 2, 2],
  ])
  const d = rankings.find(r => r.playerId === 'D')!
  assert.equal(d.absences, 1)
  assert.equal(d.pointsByDate[3], 0)
  assert.equal(d.lastPlaces, 2)
})

test('computeStandings: multas y umbral del ELIMINA', () => {
  const { rankings } = computeStandings(
    [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }],
    dates.slice(0, 1),
    { totalDates: 4, datesToEliminate: 1, pointPenalties: new Map([['A', 5]]) }
  )
  const a = rankings.find(r => r.playerId === 'A')!
  // Una fecha de cuatro: el ELIMINA todavia no descuenta, la multa si.
  assert.equal(a.eliminasActive, false)
  assert.equal(a.finalScore, 6)
})

test('computeStandings: fecha en curso, quien sigue sentado no suma', () => {
  const live: TSGameDate = { dateNumber: 4, scheduledDate: '2026-02-17', playerIds: ['A', 'B', 'C'], eliminations: [e('C', 'A', 3, 1)] }
  const { rankings, stillPlaying } = computeStandings([{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }], [live])
  assert.deepEqual(stillPlaying.map(s => s.playerId).sort(), ['A', 'B'])
  assert.equal(rankings.find(r => r.playerId === 'A')!.pointsByDate[4], undefined)
})

test('7/2 de la noche: el 2 es el primero en salir, el 7 el segundo', () => {
  assert.deepEqual(
    { dos: nightSieteDos(dates[0].eliminations).dos?.eliminatedPlayerId, siete: nightSieteDos(dates[0].eliminations).siete?.eliminatedPlayerId },
    { dos: 'D', siete: 'C' }
  )
  assert.deepEqual(nightSieteDos([]), { dos: null, siete: null })
})

test('7/2 del torneo: el 7 es el penultimo y el 2 el ultimo de la tabla', () => {
  const t = [1, 2, 3, 4, 5].map(position => ({ position, id: `p${position}` }))
  const sd = tournamentSieteDos([...t].reverse())!
  assert.equal(sd.siete.id, 'p4')
  assert.equal(sd.dos.id, 'p5')
  assert.equal(tournamentSieteDos(t.slice(0, 4)), null)
})

test('premios: el 7/2 cuenta los dos primeros en salir, ordena por total y luego por veces 2', () => {
  const a = computeTournamentAwardsData(input)
  assert.deepEqual(a.sieteYDos.map(s => [s.playerId, s.count, s.dosCount, s.sieteCount]), [
    ['D', 2, 2, 0],
    ['A', 2, 0, 2],
    ['B', 1, 1, 0],
    ['C', 1, 0, 1],
  ])
  assert.deepEqual(a.varon, [{ playerId: 'C', count: 4 }])
  assert.deepEqual(a.gay, [{ playerId: 'D', count: 0 }])
  assert.deepEqual(a.faltas, [{ playerId: 'D', count: 1 }])
  assert.deepEqual(a.victorias, [])
  assert.deepEqual(a.sinPodio, ['D'])
  // El invitado nunca entra en los premios.
  assert.ok(!a.podios.some(p => p.playerId === 'G'))
})

test('pares de eliminacion: ignora al ganador y filtra P&H por elegibles', () => {
  const all = dates.flatMap(d => d.eliminations.map(x => ({ ...x, date: d.dateNumber })))
  const pairs = aggregateEliminationPairs(all)
  assert.deepEqual([pairs[0].eliminatorId, pairs[0].eliminatedId, pairs[0].count, pairs[0].first, pairs[0].last], ['B', 'C', 2, 1, 2])
  assert.ok(!pairs.some(p => p.eliminatorId === p.eliminatedId))
  assert.ok(!aggregateEliminationPairs(all, new Set(['A', 'B', 'C', 'D'])).some(p => p.eliminatedId === 'G'))
})

test('reporte: resumen del torneo', () => {
  const r = buildTournamentReport(input)
  const s = r.summary
  assert.equal(s.datesPlayed, 3)
  assert.equal(s.datesScheduled, 4)
  assert.equal(s.registeredPlayers, 4)
  assert.equal(s.distinctGuests, 1)
  assert.equal(s.totalParticipations, 12)
  assert.equal(s.guestParticipations, 1)
  assert.equal(s.totalEliminations, 9)
  assert.deepEqual(s.maxAttendance, { count: 5, dateNumbers: [1] })
  assert.deepEqual(s.minAttendance, { count: 3, dateNumbers: [3] })
  assert.equal(s.dateWinnersCount, 3)
  assert.equal(s.champion, 'Beto')
  assert.equal(s.prizeMoney, null)
  assert.ok(r.summaryRows.find(x => x.fillIn)?.label.includes('dinero'))
})

test('reporte: evolucion, lideres, descartes y estadisticas por jugador', () => {
  const r = buildTournamentReport(input)
  assert.deepEqual(r.leaders, [['A'], ['A'], ['B']])
  assert.equal(r.leaderChanges, 1)
  const b = r.players.find(p => p.playerId === 'B')!
  assert.deepEqual(b.evolution, [2, 2, 1])
  assert.deepEqual(b.biggestRise, { positions: 1, dateNumber: 3 })
  assert.deepEqual(b.discardedDates, [3])
  const d = r.players.find(p => p.playerId === 'D')!
  assert.equal(d.longestAttendanceStreak, 2)
  assert.equal(d.dos, 2)
  assert.equal(d.eliminationsReceived, 2)
  const c = r.players.find(p => p.playerId === 'C')!
  assert.deepEqual([c.bestNight, c.worstNight, c.averageNight], [1, 4, 2.3])
  assert.equal(r.dates[0].dosId, 'D')
  assert.equal(r.dates[0].sieteId, 'C')
  assert.deepEqual(r.dates[0].varonIds, ['A'])
  assert.equal(r.dates[0].guests, 1)
  assert.equal(REPORT_SHEETS[0].name, 'Resumen')
  assert.ok(REPORT_SHEETS.every(sh => sh.name.length <= 31))
})
