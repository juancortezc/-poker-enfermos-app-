/**
 * Reglas de alta, edicion y borrado de eliminaciones, con repositorios en
 * memoria (sin base). La concurrencia real se prueba contra QA; aqui
 * `runLocked` serializa las llamadas con una cola, como hace el FOR UPDATE.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Elimination, EliminationError } from '../src/domain/elimination'
import { RegisterEliminationHandler } from '../src/application/elimination/commands/RegisterEliminationHandler'
import { UpdateEliminationHandler } from '../src/application/elimination/commands/UpdateEliminationHandler'
import { DeleteEliminationHandler } from '../src/application/elimination/commands/DeleteEliminationHandler'
import type {
  EliminationRepository,
  GameDateRepository,
  GameDateInfo,
  PlayerRepository,
} from '../src/application/elimination'

const PLAYERS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

function setup(status: GameDateInfo['status'] = 'in_progress') {
  const gameDate: GameDateInfo = {
    id: 1,
    tournamentId: 1,
    status,
    playerIds: [...PLAYERS],
    scheduledDate: new Date('2026-11-24T12:00:00Z'),
  }
  let rows: Elimination[] = []
  let nextId = 1
  let lock: Promise<unknown> = Promise.resolve()

  const elims: EliminationRepository = {
    async save(e) {
      const saved = Elimination.reconstitute({
        id: nextId++,
        gameDateId: e.gameDateId,
        position: e.position,
        points: e.points,
        eliminatedPlayerId: e.eliminatedPlayerId,
        eliminatorPlayerId: e.eliminatorPlayerId ?? e.eliminatedPlayerId,
        eliminationTime: e.eliminationTime,
      })
      rows.push(saved)
      return saved
    },
    async findById(id) { return rows.find((r) => r.id === id) ?? null },
    async findByGameDateId() { return rows },
    async existsByPlayerInGameDate(pid) { return rows.some((r) => r.eliminatedPlayerId === pid) },
    async existsByPositionInGameDate(pos) { return rows.some((r) => r.position.value === pos) },
    async findByPlayerInGameDate(pid) { return rows.find((r) => r.eliminatedPlayerId === pid) ?? null },
    async findLowestPosition() {
      return rows.length ? Math.min(...rows.map((r) => r.position.value)) : null
    },
    async countByGameDateId() { return rows.length },
    async update(e) {
      rows = rows.map((r) => (r.id === e.id ? e : r))
      return e
    },
    async delete(id) { rows = rows.filter((r) => r.id !== id) },
    async existsLaterEliminations(_g, pos) { return rows.some((r) => r.position.value < pos) },
  }
  const dates: GameDateRepository = {
    async findById() { return gameDate },
    async markAsCompleted() { gameDate.status = 'completed' },
    runLocked<T>(_id: number, fn: () => Promise<T>) {
      const run = lock.then(fn, fn)
      lock = run.catch(() => undefined)
      return run
    },
  }
  const players: PlayerRepository = {
    async findById(id) { return { id, firstName: id, lastName: 'QA' } },
    async findByIds(ids) { return ids.map((id) => ({ id, firstName: id, lastName: 'QA' })) },
    async updateLastVictoryDate() {},
  }
  const notifications = { async notifyPlayerEliminated() {}, async notifyWinnerDeclared() {} }
  const stats = { async updateStats() {} }

  return {
    gameDate,
    rows: () => rows,
    register: new RegisterEliminationHandler(elims, dates, players, notifications, stats),
    update: new UpdateEliminationHandler(elims, dates, players),
    remove: new DeleteEliminationHandler(elims, dates),
  }
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p
    return 'OK'
  } catch (e) {
    assert.ok(e instanceof EliminationError, `error de dominio, no ${e}`)
    return e.code
  }
}

test('alta valida: posicion N con la tabla de 6 jugadores', async () => {
  const s = setup()
  const r = await s.register.execute({ gameDateId: 1, position: 6, eliminatedPlayerId: 'p1', eliminatorPlayerId: 'p2' })
  assert.equal(r.points, 1)
  const r2 = await s.register.execute({ gameDateId: 1, position: 5, eliminatedPlayerId: 'p3', eliminatorPlayerId: 'p2' })
  assert.equal(r2.points, 2)
})

test('rechazos del alta', async () => {
  const s = setup()
  const reg = (position: number, eliminatedPlayerId: string, eliminatorPlayerId: string | null) =>
    code(s.register.execute({ gameDateId: 1, position, eliminatedPlayerId, eliminatorPlayerId }))

  assert.equal(await reg(6, 'p1', 'p1'), 'SELF_ELIMINATION')
  assert.equal(await reg(6, 'fuera', 'p2'), 'PLAYER_NOT_IN_GAME_DATE')
  assert.equal(await reg(6, 'p1', 'fuera'), 'PLAYER_NOT_IN_GAME_DATE')
  assert.equal(await reg(7, 'p1', 'p2'), 'INVALID_POSITION')
  assert.equal(await reg(3, 'p1', 'p2'), 'POSITION_NOT_NEXT')
  assert.equal(await reg(6, 'p1', 'p2'), 'OK')
  assert.equal(await reg(6, 'p3', 'p2'), 'POSITION_ALREADY_TAKEN')
  assert.equal(await reg(5, 'p1', 'p2'), 'PLAYER_ALREADY_ELIMINATED')
  assert.equal(await reg(5, 'p3', 'p1'), 'INVALID_ELIMINATOR')
})

test('fecha que no esta en curso', async () => {
  const s = setup('completed')
  assert.equal(
    await code(s.register.execute({ gameDateId: 1, position: 6, eliminatedPlayerId: 'p1', eliminatorPlayerId: 'p2' })),
    'GAME_DATE_NOT_IN_PROGRESS'
  )
})

test('4 altas simultaneas a la misma posicion: una entra, tres chocan', async () => {
  const s = setup()
  const results = await Promise.all(
    ['p1', 'p3', 'p4', 'p5'].map((p) =>
      code(s.register.execute({ gameDateId: 1, position: 6, eliminatedPlayerId: p, eliminatorPlayerId: 'p2' }))
    )
  )
  assert.equal(results.filter((r) => r === 'OK').length, 1)
  assert.equal(results.filter((r) => r === 'POSITION_ALREADY_TAKEN').length, 3)
  assert.equal(s.rows().length, 1)
})

test('posicion 2 con eliminador cierra la fecha con el ganador', async () => {
  const s = setup()
  const order = ['p1', 'p3', 'p4', 'p5']
  for (let i = 0; i < order.length; i++) {
    await s.register.execute({ gameDateId: 1, position: 6 - i, eliminatedPlayerId: order[i], eliminatorPlayerId: 'p2' })
  }
  const r = await s.register.execute({ gameDateId: 1, position: 2, eliminatedPlayerId: 'p6', eliminatorPlayerId: 'p2' })
  assert.equal(r.triggeredAutoComplete, true)
  assert.equal(r.winnerElimination?.position, 1)
  assert.equal(r.winnerElimination?.points, 12)
  assert.equal(s.gameDate.status, 'completed')
})

test('edicion: eliminador = eliminado y jugador fuera de la fecha', async () => {
  const s = setup()
  const r = await s.register.execute({ gameDateId: 1, position: 6, eliminatedPlayerId: 'p1', eliminatorPlayerId: 'p2' })
  assert.equal(await code(s.update.execute({ eliminationId: r.id, eliminatorPlayerId: 'p1' })), 'SELF_ELIMINATION')
  assert.equal(await code(s.update.execute({ eliminationId: r.id, eliminatedPlayerId: 'fuera' })), 'PLAYER_NOT_IN_GAME_DATE')
  assert.equal(await code(s.update.execute({ eliminationId: r.id, eliminatorPlayerId: 'fuera' })), 'PLAYER_NOT_IN_GAME_DATE')
  assert.equal(await code(s.update.execute({ eliminationId: 999 })), 'NOT_FOUND')
  assert.equal(await code(s.update.execute({ eliminationId: r.id, eliminatorPlayerId: 'p3' })), 'OK')
})

test('borrado: solo la ultima; la anterior da NOT_LAST_ELIMINATION', async () => {
  const s = setup()
  const a = await s.register.execute({ gameDateId: 1, position: 6, eliminatedPlayerId: 'p1', eliminatorPlayerId: 'p2' })
  const b = await s.register.execute({ gameDateId: 1, position: 5, eliminatedPlayerId: 'p3', eliminatorPlayerId: 'p2' })
  assert.equal(await code(s.remove.execute({ eliminationId: a.id })), 'NOT_LAST_ELIMINATION')
  assert.equal(await code(s.remove.execute({ eliminationId: 999 })), 'NOT_FOUND')
  assert.equal(await code(s.remove.execute({ eliminationId: b.id })), 'OK')
  assert.equal(await code(s.remove.execute({ eliminationId: a.id })), 'OK')
})
