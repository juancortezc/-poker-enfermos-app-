/**
 * Envío Expo: lotes de 100, conteo de enviados y detección de
 * DeviceNotRegistered. Sin red: el fetch se inyecta.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPO_PUSH_URL,
  buildExpoMessage,
  isExpoPushToken,
  sendExpoPush,
  type ExpoDevice,
  type ExpoPushMessage,
} from '../src/lib/expo-push'

const device = (i: number): ExpoDevice => ({ id: `d${i}`, expoToken: `ExponentPushToken[tok${i}]` })

test('valida el formato del token', () => {
  assert.ok(isExpoPushToken('ExponentPushToken[abc-123]'))
  assert.ok(isExpoPushToken('ExpoPushToken[abc]'))
  assert.ok(!isExpoPushToken('abc'))
  assert.ok(!isExpoPushToken('ExponentPushToken[]'))
  assert.ok(!isExpoPushToken(42))
})

test('mensaje: sonido salvo silent, tag como collapseId, canal default', () => {
  const m = buildExpoMessage('ExpoPushToken[a]', { title: 't', body: 'b', data: { url: '/' }, tag: 'x' })
  assert.equal(m.sound, 'default')
  assert.equal(m.collapseId, 'x')
  assert.equal(m.channelId, 'default')
  assert.equal(buildExpoMessage('ExpoPushToken[a]', { title: 't', body: 'b', silent: true }).sound, null)
})

test('lotes de 100 y DeviceNotRegistered', async () => {
  const devices = Array.from({ length: 205 }, (_, i) => device(i))
  const batches: ExpoPushMessage[][] = []

  const fakeFetch = async (url: string, init: RequestInit) => {
    assert.equal(url, EXPO_PUSH_URL)
    const messages = JSON.parse(String(init.body)) as ExpoPushMessage[]
    batches.push(messages)
    const data = messages.map((m) =>
      m.to === 'ExponentPushToken[tok3]' || m.to === 'ExponentPushToken[tok150]'
        ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }
        : m.to === 'ExponentPushToken[tok7]'
          ? { status: 'error', message: 'rate', details: { error: 'MessageRateExceeded' } }
          : { status: 'ok', id: 'x' }
    )
    return new Response(JSON.stringify({ data }), { status: 200 })
  }

  const result = await sendExpoPush(devices, { title: 't', body: 'b' }, fakeFetch)
  assert.deepEqual(batches.map((b) => b.length), [100, 100, 5])
  assert.equal(result.sent, 202)
  assert.deepEqual(result.deadDeviceIds, ['d3', 'd150'])
})

test('un lote rechazado no desactiva a nadie', async () => {
  const fakeFetch = async () => new Response('boom', { status: 500 })
  const result = await sendExpoPush([device(1)], { title: 't', body: 'b' }, fakeFetch)
  assert.deepEqual(result, { sent: 0, deadDeviceIds: [] })
})

test('sin dispositivos no llama a la red', async () => {
  let called = false
  const result = await sendExpoPush([], { title: 't', body: 'b' }, async () => {
    called = true
    return new Response('{}')
  })
  assert.equal(called, false)
  assert.equal(result.sent, 0)
})
