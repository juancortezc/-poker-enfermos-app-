/**
 * El cliente de la web acepta los dos formatos de la API: el viejo (body a
 * secas, `{ error: "texto" }`) y el nuevo (`{ success, data }` y
 * `{ success: false, error: { code, message, ... } }`).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  unwrapApiBody,
  normalizeApiError,
  apiErrorMessage,
  readApiJson,
  parseApiResponse,
  ApiError,
} from '../src/lib/api-client'

const nuevoError = {
  success: false,
  error: {
    code: 'POSITION_ALREADY_TAKEN',
    message: 'La posición ya está registrada',
    details: { hint: 'revisá la lista' },
    errorId: 'abc-123',
    timestamp: '2026-11-25T00:00:00.000Z',
    path: '/api/eliminations',
  },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('unwrapApiBody: formato nuevo devuelve data', () => {
  assert.deepEqual(unwrapApiBody({ success: true, data: [1, 2] }), [1, 2])
  assert.equal(unwrapApiBody({ success: true, data: null }), null)
})

test('unwrapApiBody: formato viejo pasa tal cual', () => {
  assert.deepEqual(unwrapApiBody([1, 2]), [1, 2])
  assert.deepEqual(unwrapApiBody({ tournament: { id: 1 } }), { tournament: { id: 1 } })
  assert.deepEqual(unwrapApiBody({ success: true }), { success: true })
  assert.equal(unwrapApiBody(null), null)
})

test('normalizeApiError: formato nuevo queda con error en texto y extras en la raiz', () => {
  const e = normalizeApiError(nuevoError, 409)
  assert.equal(e.error, 'La posición ya está registrada')
  assert.equal(e.code, 'POSITION_ALREADY_TAKEN')
  assert.equal(e.errorId, 'abc-123')
  assert.equal(e.hint, 'revisá la lista')
  assert.equal(typeof e.error, 'string')
})

test('normalizeApiError: validacion conserva errors[]', () => {
  const e = normalizeApiError({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'position: Debe ser un número', errors: [{ field: 'position', message: 'Debe ser un número' }], errorId: 'x', timestamp: '', path: '' },
  })
  assert.equal(e.error, 'position: Debe ser un número')
  assert.deepEqual(e.errors, [{ field: 'position', message: 'Debe ser un número' }])
})

test('normalizeApiError: formato viejo y cuerpos raros', () => {
  assert.deepEqual(normalizeApiError({ error: 'Fecha no encontrada', code: 'NOT_FOUND' }), { error: 'Fecha no encontrada', code: 'NOT_FOUND' })
  assert.equal(normalizeApiError({ message: 'algo' }).error, 'algo')
  assert.equal(normalizeApiError('Internal Server Error', 500).error, 'Internal Server Error')
  assert.equal(normalizeApiError(null, 502).error, 'Error 502')
  assert.equal(normalizeApiError({}, 500).error, 'Error 500')
})

test('apiErrorMessage usa el fallback si no hay mensaje', () => {
  assert.equal(apiErrorMessage(nuevoError, 'x'), 'La posición ya está registrada')
  assert.equal(apiErrorMessage({ error: 'viejo' }, 'x'), 'viejo')
  assert.equal(apiErrorMessage({}, 'fallback'), 'fallback')
})

test('readApiJson: ok desenvuelve con los dos formatos', async () => {
  assert.deepEqual(await readApiJson(json({ success: true, data: { a: 1 } })), { a: 1 })
  assert.deepEqual(await readApiJson(json({ a: 1 })), { a: 1 })
  assert.equal(await readApiJson(new Response(null, { status: 204 })), null)
})

test('readApiJson: error aplanado, nunca lanza por status', async () => {
  const nuevo = await readApiJson(json(nuevoError, 409))
  assert.equal(nuevo.error, 'La posición ya está registrada')
  assert.equal(nuevo.code, 'POSITION_ALREADY_TAKEN')
  const viejo = await readApiJson(json({ error: 'Sin permisos suficientes' }, 403))
  assert.equal(viejo.error, 'Sin permisos suficientes')
  const html = await readApiJson(new Response('<html>Bad gateway</html>', { status: 502 }))
  assert.equal(typeof html.error, 'string')
})

test('parseApiResponse: ok desenvuelve y error lanza ApiError', async () => {
  assert.deepEqual(await parseApiResponse(json({ success: true, data: [3] })), [3])
  assert.deepEqual(await parseApiResponse(json([3])), [3])

  await assert.rejects(parseApiResponse(json(nuevoError, 409)), (err: unknown) => {
    assert.ok(err instanceof ApiError)
    assert.equal(err.status, 409)
    assert.equal(err.code, 'POSITION_ALREADY_TAKEN')
    assert.equal(err.errorId, 'abc-123')
    assert.equal(err.message, 'La posición ya está registrada')
    assert.equal(err.body.hint, 'revisá la lista')
    assert.ok(err.info.includes('POSITION_ALREADY_TAKEN'))
    return true
  })

  await assert.rejects(parseApiResponse(json({ error: 'Acceso no autorizado' }, 401)), (err: unknown) => {
    assert.ok(err instanceof ApiError)
    assert.equal(err.status, 401)
    assert.equal(err.message, 'Acceso no autorizado')
    assert.equal(err.code, undefined)
    return true
  })
})
