/**
 * withErrorHandler: AppError, ZodError, Prisma y errores desconocidos salen
 * con el formato `{ success: false, error: { code, message, ... } }`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError, withErrorHandler } from '../src/lib/errors'
import { ok } from '../src/lib/http'
import { ValidacionNoDisponible } from '../src/lib/api-auth'

const URL_ = 'http://localhost/api/prueba?x=1'

async function call(fn: () => Promise<Response>) {
  const handler = withErrorHandler(async (_req: Request, _ctx: { params: Promise<{ id: string }> }) => fn())
  const res = await handler(new Request(URL_), { params: Promise.resolve({ id: '1' }) })
  return { status: res.status, body: await res.json() }
}

test('respuesta correcta pasa intacta y ok() arma el sobre', async () => {
  const { status, body } = await call(async () => ok({ a: 1 }, 201))
  assert.equal(status, 201)
  assert.deepEqual(body, { success: true, data: { a: 1 } })
})

test('AppError: status, code, errorId, timestamp y path', async () => {
  const { status, body } = await call(async () => {
    throw AppError.conflict('Esa posicion ya esta registrada', 'POSITION_ALREADY_TAKEN', { hint: 'x' })
  })
  assert.equal(status, 409)
  assert.equal(body.success, false)
  assert.equal(body.error.code, 'POSITION_ALREADY_TAKEN')
  assert.equal(body.error.message, 'Esa posicion ya esta registrada')
  assert.deepEqual(body.error.details, { hint: 'x' })
  assert.match(body.error.errorId, /^[0-9a-f-]{36}$/)
  assert.ok(!Number.isNaN(Date.parse(body.error.timestamp)))
  assert.equal(body.error.path, '/api/prueba')
})

test('estaticos de AppError', () => {
  assert.equal(AppError.badRequest('x').statusCode, 400)
  assert.equal(AppError.unauthorized().statusCode, 401)
  assert.equal(AppError.forbidden().code, 'FORBIDDEN')
  assert.equal(AppError.notFound('x').statusCode, 404)
  assert.equal(AppError.validation([{ field: 'a', message: 'b' }]).statusCode, 422)
  assert.equal(AppError.internal().statusCode, 500)
  assert.notEqual(AppError.internal().errorId, AppError.internal().errorId)
})

test('ZodError: 422 VALIDATION_ERROR con errors[]', async () => {
  const schema = z.object({ position: z.number().int(), role: z.enum(['Comision', 'Enfermo']) })
  const { status, body } = await call(async () => {
    schema.parse({ position: 'x', role: 'Rey' })
    return ok(null)
  })
  assert.equal(status, 422)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.equal(body.error.errors.length, 2)
  assert.deepEqual(body.error.errors.map((e: { field: string }) => e.field), ['position', 'role'])
  assert.ok(body.error.message.startsWith('position: '))
})

test('Prisma P2025 -> 404 y P2002 -> 409', async () => {
  const p2025 = new Prisma.PrismaClientKnownRequestError('no existe', { code: 'P2025', clientVersion: 'x' })
  const p2002 = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
  assert.equal((await call(async () => { throw p2025 })).status, 404)
  assert.equal((await call(async () => { throw p2002 })).status, 409)
})

test('ValidacionNoDisponible -> 503 AUTH_UNAVAILABLE (no cierra sesion)', async () => {
  const { status, body } = await call(async () => {
    throw new ValidacionNoDisponible()
  })
  assert.equal(status, 503)
  assert.equal(body.error.code, 'AUTH_UNAVAILABLE')
})

test('error desconocido: 500 sin filtrar el mensaje interno', async () => {
  const original = console.error
  console.error = () => {}
  try {
    const { status, body } = await call(async () => {
      throw new Error('SELECT * FROM players WHERE pin = ... /var/task/x.js')
    })
    assert.equal(status, 500)
    assert.equal(body.error.code, 'INTERNAL_ERROR')
    assert.equal(body.error.message, 'Error interno del servidor')
    assert.equal(JSON.stringify(body).includes('SELECT'), false)
    assert.equal(body.debug, undefined)
  } finally {
    console.error = original
  }
})
