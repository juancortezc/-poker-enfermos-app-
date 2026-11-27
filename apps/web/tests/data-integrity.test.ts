/**
 * T36: guardas de integridad que dependen de la base, con clientes falsos.
 * - La importación del CSV reemplaza los resultados todo o nada.
 * - Jugadores inexistentes: 422. Torneos: un solo ACTIVO; no se finaliza
 *   con fechas abiertas (409).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Prisma } from '@prisma/client'
import { AppError } from '../src/lib/errors'
import {
  assertCanFinalize,
  assertNoOtherActiveTournament,
  assertPlayersExist,
} from '../src/lib/data-integrity'
import {
  buildEliminationRows,
  importStartTime,
  replaceGameDateEliminations,
  type EliminationRow,
  type TransactionRunner,
} from '../src/lib/import-eliminations'
import type { CsvElimination } from '@poker/shared'

type Tx = Prisma.TransactionClient

async function rejectsWith(p: Promise<unknown>, status: number, code: string) {
  await assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof AppError, `esperaba AppError, llegó ${String(e)}`)
    assert.equal(e.statusCode, status)
    assert.equal(e.code, code)
    return true
  })
}

// --- Base en memoria con transacciones de verdad (copia y confirma) --------

interface State {
  status: string
  startTime: Date | null
  eliminations: Array<EliminationRow & { gameDateId: number }>
}

function fakeDb(initial: State, opts: { failOnCreate?: boolean } = {}) {
  let committed: State = structuredClone(initial)
  const db: TransactionRunner = {
    async $transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R> {
      const work: State = structuredClone(committed)
      const tx = {
        gameDate: {
          findUnique: async () => ({ status: work.status }),
          update: async ({ data }: { data: { status: string; startTime: Date } }) => {
            work.status = data.status
            work.startTime = data.startTime
            return {}
          },
        },
        elimination: {
          deleteMany: async () => {
            const count = work.eliminations.length
            work.eliminations = []
            return { count }
          },
          createMany: async ({ data }: { data: State['eliminations'] }) => {
            if (opts.failOnCreate) throw new Error('la base se cayó')
            work.eliminations.push(...data)
            return { count: data.length }
          },
        },
      } as unknown as Tx
      const result = await fn(tx) // si lanza, `committed` no cambia (rollback)
      committed = work
      return result
    },
  }
  return { db, state: () => committed }
}

const OLD: State['eliminations'] = [
  { gameDateId: 7, position: 2, points: 1, eliminatedPlayerId: 'b', eliminatorPlayerId: 'a', eliminationTime: 'x' },
  { gameDateId: 7, position: 1, points: 4, eliminatedPlayerId: 'a', eliminatorPlayerId: 'a', eliminationTime: 'y' },
]
const NEW: EliminationRow[] = [
  { position: 3, points: 1, eliminatedPlayerId: 'c', eliminatorPlayerId: 'a', eliminationTime: 't1' },
  { position: 2, points: 4, eliminatedPlayerId: 'b', eliminatorPlayerId: 'a', eliminationTime: 't2' },
  { position: 1, points: 7, eliminatedPlayerId: 'a', eliminatorPlayerId: 'a', eliminationTime: 't3' },
]

test('import: reemplaza las eliminaciones y completa la fecha en una transacción', async () => {
  const { db, state } = fakeDb({ status: 'completed', startTime: null, eliminations: OLD })
  const r = await replaceGameDateEliminations(db, 7, '2026-12-01', NEW)
  assert.deepEqual(r, { deleted: 2, created: 3 })
  assert.equal(state().eliminations.length, 3)
  assert.equal(state().status, 'completed')
  assert.equal(state().startTime?.toISOString(), '2026-12-02T00:00:00.000Z') // 19:00 en Ecuador
})

test('import: si falla al crear, la fecha conserva sus eliminaciones (antes quedaba en 0)', async () => {
  const { db, state } = fakeDb({ status: 'completed', startTime: null, eliminations: OLD }, { failOnCreate: true })
  await assert.rejects(replaceGameDateEliminations(db, 7, '2026-12-01', NEW), /la base se cayó/)
  assert.deepEqual(state().eliminations, OLD)
})

test('import: una fecha en curso se rechaza con 409 sin tocar nada', async () => {
  const { db, state } = fakeDb({ status: 'in_progress', startTime: null, eliminations: OLD })
  await rejectsWith(replaceGameDateEliminations(db, 7, '2026-12-01', NEW), 409, 'GAME_DATE_IN_PROGRESS')
  assert.deepEqual(state().eliminations, OLD)
  assert.equal(state().status, 'in_progress')
})

test('import: filas del CSV → eliminaciones; nombre desconocido es 400 antes de abrir la transacción', async () => {
  const rows: CsvElimination[] = [
    { torneo: 'Torneo 29', fecha: 4, date: '2026-12-01', posicion: 1, eliminado: 'Ana', eliminador: '', puntos: 7 },
    { torneo: 'Torneo 29', fecha: 4, date: '2026-12-01', posicion: 2, eliminado: 'Beto', eliminador: 'Ana', puntos: 4 },
  ]
  const ids: Record<string, string> = { Ana: 'a', Beto: 'b' }
  const out = await buildEliminationRows(rows, async (n) => ids[n] ?? null)
  assert.deepEqual(
    out.map((r) => [r.position, r.eliminatedPlayerId, r.eliminatorPlayerId, r.points]),
    [
      [2, 'b', 'a', 4],
      [1, 'a', 'a', 7],
    ]
  )
  assert.equal(out[0].eliminationTime, importStartTime('2026-12-01').toISOString())

  await rejectsWith(
    buildEliminationRows([{ ...rows[1], eliminador: 'Nadie' }], async (n) => ids[n] ?? null),
    400,
    'PLAYER_NOT_FOUND'
  )
})

// --- Jugadores y torneos ---------------------------------------------------

function playersDb(existing: string[]) {
  return {
    player: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.filter((id) => existing.includes(id)).map((id) => ({ id })),
    },
  } as unknown as Pick<Tx, 'player'>
}

test('jugadores: ids inexistentes son 422 con un error por id', async () => {
  await assertPlayersExist(playersDb(['a', 'b']), ['a', 'b'])
  await assert.rejects(assertPlayersExist(playersDb(['a']), ['a', 'x', 'y']), (e: unknown) => {
    assert.ok(e instanceof AppError)
    assert.equal(e.statusCode, 422)
    assert.equal(e.code, 'VALIDATION_ERROR')
    assert.deepEqual(
      e.errors?.map((d) => d.message),
      ['El jugador x no existe', 'El jugador y no existe']
    )
    return true
  })
})

function datesDb(dates: Array<{ dateNumber: number; status: string }>) {
  return { gameDate: { findMany: async () => dates } } as unknown as Pick<Tx, 'gameDate'>
}

test('torneo: no se finaliza con fechas abiertas (409)', async () => {
  const t = { id: 1, number: 29 }
  await assertCanFinalize(datesDb([{ dateNumber: 1, status: 'completed' }, { dateNumber: 2, status: 'cancelled' }]), t)
  await rejectsWith(
    assertCanFinalize(datesDb([{ dateNumber: 1, status: 'completed' }, { dateNumber: 2, status: 'CREATED' }]), t),
    409,
    'TOURNAMENT_HAS_OPEN_DATES'
  )
})

test('torneo: no se activa si ya hay otro ACTIVO (409)', async () => {
  const db = (other: { id: number; number: number } | null) =>
    ({ tournament: { findFirst: async () => other } }) as unknown as Pick<Tx, 'tournament'>
  await assertNoOtherActiveTournament(db(null), 2)
  await rejectsWith(assertNoOtherActiveTournament(db({ id: 1, number: 29 }), 2), 409, 'ACTIVE_TOURNAMENT_EXISTS')
})
