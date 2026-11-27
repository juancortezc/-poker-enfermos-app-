/**
 * POST /api/players/guests: alta rapida de invitados. La ruta real exige
 * Comision; el resto (validacion, invitador, duplicados y alta) se prueba con
 * el mismo armado de la ruta sobre una base falsa.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { createGuestSchema } from '@poker/shared'
import { withErrorHandler } from '../src/lib/errors'
import { ok, parseBody } from '../src/lib/http'
import { createGuest, withLastPlayed, type GameDateDb, type GuestDb } from '../src/lib/guests'
import { POST } from '../src/app/api/players/guests/route'

type Row = { id: string; firstName: string; lastName: string; role: string; isActive: boolean; inviterId?: string | null }

function fakeDb(rows: Row[]) {
  const created: Record<string, unknown>[] = []
  const withInviter = (r: Row) => {
    const inv = rows.find((x) => x.id === r.inviterId)
    return { ...r, inviter: inv ? { id: inv.id, firstName: inv.firstName, lastName: inv.lastName } : null }
  }
  const db = {
    player: {
      findFirst: async ({ where }: { where: { id: string; isActive: boolean; role: { in: string[] } } }) =>
        rows.find((r) => r.id === where.id && r.isActive === where.isActive && where.role.in.includes(r.role)) ?? null,
      findMany: async ({ where }: { where: { role: string; isActive: boolean } }) =>
        rows.filter((r) => r.role === where.role && r.isActive === where.isActive).map(withInviter),
      create: async ({ data }: { data: Row & Record<string, unknown> }) => {
        created.push(data)
        const row = { ...data, id: `new${created.length}` }
        rows.push(row)
        return withInviter(row)
      },
    },
  }
  return { db: db as unknown as GuestDb, created }
}

const ROWS: Row[] = [
  { id: 'jorge', firstName: 'Jorge', lastName: 'Perez', role: 'Enfermo', isActive: true },
  { id: 'juan', firstName: 'Juan', lastName: 'Tapia', role: 'Comision', isActive: true },
  { id: 'viejo', firstName: 'Pepe', lastName: 'Retirado', role: 'Enfermo', isActive: false },
  { id: 'agus', firstName: 'Agustín', lastName: 'Guerrero', role: 'Invitado', isActive: true, inviterId: 'jorge' },
  { id: 'baja', firstName: 'Carlos', lastName: 'Inactivo', role: 'Invitado', isActive: false, inviterId: 'juan' },
]

async function post(body: unknown, rows: Row[] = ROWS.map((r) => ({ ...r }))) {
  const { db, created } = fakeDb(rows)
  const handler = withErrorHandler(async (req: NextRequest) =>
    ok(await createGuest(db, await parseBody(req, createGuestSchema)), 201)
  )
  const req = new NextRequest('http://localhost/api/players/guests', { method: 'POST', body: JSON.stringify(body) })
  const res = await handler(req, { params: Promise.resolve({}) })
  return { status: res.status, body: await res.json(), created }
}

test('la ruta real exige sesion (401 sin credencial)', async () => {
  const req = new NextRequest('http://localhost/api/players/guests', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Ana', lastName: 'Lopez', inviterId: 'jorge' }),
  })
  const res = await POST(req, { params: Promise.resolve({}) })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).success, false)
})

test('crea el invitado con nombre real, foto de invitado y quien lo invita', async () => {
  const { status, body, created } = await post({ firstName: ' Ana ', lastName: 'López', inviterId: 'juan' })
  assert.equal(status, 201)
  assert.equal(body.success, true)
  assert.equal(body.data.firstName, 'Ana')
  assert.equal(body.data.lastName, 'López')
  assert.equal(body.data.role, 'Invitado')
  assert.equal(body.data.lastPlayedAt, null)
  assert.deepEqual(body.data.inviter, { id: 'juan', firstName: 'Juan', lastName: 'Tapia' })
  assert.equal(created.length, 1)
  assert.equal(created[0].isActive, true)
  assert.equal(created[0].inviterId, 'juan')
})

test('nombre generico: 422 con el mensaje amable y sin crear nada', async () => {
  const { status, body, created } = await post({ firstName: 'Sobrino', lastName: 'Diego', inviterId: 'jorge' })
  assert.equal(status, 422)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.match(body.error.errors[0].message, /nombre y apellido reales/)
  assert.equal(created.length, 0)
})

test('invitador inexistente, inactivo o invitado: 422 en inviterId', async () => {
  for (const inviterId of ['nadie', 'viejo', 'agus']) {
    const { status, body, created } = await post({ firstName: 'Ana', lastName: 'Lopez', inviterId })
    assert.equal(status, 422, inviterId)
    assert.equal(body.error.errors[0].field, 'inviterId')
    assert.equal(created.length, 0)
  }
})

test('duplicado activo (sin tildes ni mayusculas): 409 con el existente para elegirlo', async () => {
  const { status, body, created } = await post({ firstName: 'AGUSTIN', lastName: ' guerrero', inviterId: 'juan' })
  assert.equal(status, 409)
  assert.equal(body.error.code, 'DUPLICATE_GUEST')
  assert.match(body.error.message, /Agustín Guerrero \(invitado por Jorge Perez\)/)
  assert.equal(body.error.details.existingGuest.id, 'agus')
  assert.equal(created.length, 0)
})

test('un invitado inactivo con el mismo nombre no bloquea el alta', async () => {
  const { status } = await post({ firstName: 'Carlos', lastName: 'Inactivo', inviterId: 'juan' })
  assert.equal(status, 201)
})

test('withLastPlayed: dia de la fecha mas reciente de cada invitado', async () => {
  const db = {
    gameDate: {
      findMany: async () => [
        { playerIds: ['a', 'x'], scheduledDate: new Date('2026-09-15T12:00:00Z') },
        { playerIds: ['a', 'b'], scheduledDate: new Date('2026-02-24T12:00:00Z') },
      ],
    },
  } as unknown as GameDateDb
  const out = await withLastPlayed(db, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  assert.deepEqual(out, [
    { id: 'a', lastPlayedAt: '2026-09-15T12:00:00.000Z' },
    { id: 'b', lastPlayedAt: '2026-02-24T12:00:00.000Z' },
    { id: 'c', lastPlayedAt: null },
  ])
  assert.deepEqual(await withLastPlayed(db, []), [])
})
