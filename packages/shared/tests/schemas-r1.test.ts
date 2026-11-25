import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  loginSchema,
  loginPinSchema,
  authMeQuerySchema,
  playersQuerySchema,
  createPlayerSchema,
  updatePlayerSchema,
  changePlayerRoleSchema,
  availableGuestsQuerySchema,
  playerIdParamsSchema,
  updateProfileSchema,
  multasQuerySchema,
  createMultaSchema,
  updateMultaSchema,
  registerPushDeviceSchema,
  unregisterPushDeviceSchema,
  sendNotificationSchema,
  broadcastNotificationSchema,
  testNotificationSchema,
  pushSubscriptionSchema,
  unsubscribeQuerySchema,
  notificationHistoryQuerySchema,
  notificationConfigSchema,
} from '../src/index'

const fails = (r: { success: boolean }) => assert.equal(r.success, false)

test('auth: login y clave', () => {
  assert.deepEqual(loginSchema.parse({ pin: 'abcd' }), { pin: 'abcd' })
  assert.deepEqual(loginSchema.parse({ adminKey: 'x', pin: null }), { adminKey: 'x', pin: null })
  fails(loginSchema.safeParse({ pin: 1234 }))
  assert.equal(loginPinSchema.safeParse('1234').success, true)
  fails(loginPinSchema.safeParse('12'))
  fails(loginPinSchema.safeParse('12 34'))
  assert.equal(authMeQuerySchema.parse({ id: 'cabc' }).id, 'cabc')
  fails(authMeQuerySchema.safeParse({}))
})

test('players: query de directorio', () => {
  assert.equal(playersQuerySchema.parse({}).role, undefined)
  assert.deepEqual(playersQuerySchema.parse({ role: 'Enfermo, Comision', includeInactive: 'true' }), {
    role: ['Enfermo', 'Comision'],
    includeInactive: true,
  })
  assert.equal(playersQuerySchema.parse({ role: '' }).role, undefined)
  fails(playersQuerySchema.safeParse({ role: 'Admin' }))
  fails(playersQuerySchema.safeParse({ includeInactive: 'si' }))
})

test('players: alta', () => {
  const ok = createPlayerSchema.parse({ firstName: ' Ana ', lastName: ' Paz ', role: 'Enfermo' })
  assert.equal(ok.firstName, 'Ana')
  assert.equal(ok.lastName, 'Paz')
  assert.deepEqual(ok.aliases, [])
  // Invitado sin apellido vale; socio sin apellido no.
  assert.equal(createPlayerSchema.safeParse({ firstName: 'Sobrino', role: 'Invitado', inviterId: 'p1' }).success, true)
  const sinApellido = createPlayerSchema.safeParse({ firstName: 'Ana', role: 'Enfermo' })
  assert.equal(sinApellido.success, false)
  assert.equal(sinApellido.error?.issues[0].path[0], 'lastName')
  fails(createPlayerSchema.safeParse({ firstName: '  ', lastName: 'x', role: 'Enfermo' }))
  fails(createPlayerSchema.safeParse({ firstName: 'Ana', lastName: 'x', role: 'Rey' }))
  fails(createPlayerSchema.safeParse({ firstName: 'Ana', lastName: 'x', role: 'Enfermo', joinYear: '2020' }))
})

test('players: edicion, rol y params', () => {
  assert.deepEqual(updatePlayerSchema.parse({}), {})
  assert.equal(updatePlayerSchema.parse({ lastName: '  ' }).lastName, '')
  assert.equal(updatePlayerSchema.parse({ photoUrl: null }).photoUrl, null)
  fails(updatePlayerSchema.safeParse({ firstName: ' ' }))
  fails(updatePlayerSchema.safeParse({ isActive: 'no' }))
  fails(updatePlayerSchema.safeParse({ aliases: 'x' }))
  assert.equal(changePlayerRoleSchema.safeParse({ newRole: 'Enfermo' }).success, true)
  fails(changePlayerRoleSchema.safeParse({ newRole: 'Invitado' }))
  assert.equal(changePlayerRoleSchema.safeParse({ newRole: 'Invitado', inviterId: 'p1' }).success, true)
  fails(changePlayerRoleSchema.safeParse({ newRole: 'jefe' }))
  assert.deepEqual(availableGuestsQuerySchema.parse({ tournamentId: '3' }), { tournamentId: 3 })
  fails(availableGuestsQuerySchema.safeParse({ tournamentId: 'x' }))
  fails(playerIdParamsSchema.safeParse({ id: '' }))
})

test('profile', () => {
  assert.deepEqual(updateProfileSchema.parse({ email: '', phone: null }), { email: '', phone: null })
  assert.equal(updateProfileSchema.safeParse({ email: 'a@b.co' }).success, true)
  fails(updateProfileSchema.safeParse({ email: 'no-es-correo' }))
  fails(updateProfileSchema.safeParse({ pin: 1234 }))
  fails(updateProfileSchema.safeParse({ phone: 99 }))
})

test('multas', () => {
  const alta = createMultaSchema.parse({ tournamentId: 3, playerId: 'p1', reason: 'Tarde', pointsPenalty: '5', chipsAmount: '', moneyAmount: '2.5' })
  assert.deepEqual(alta, { tournamentId: 3, playerId: 'p1', reason: 'Tarde', pointsPenalty: 5, chipsAmount: null, moneyAmount: 2.5, paid: false })
  assert.equal(createMultaSchema.parse({ tournamentId: '3', playerId: 'p1', reason: 'x' }).pointsPenalty, 0)
  fails(createMultaSchema.safeParse({ playerId: 'p1', reason: 'x' }))
  fails(createMultaSchema.safeParse({ tournamentId: 3, playerId: 'p1', reason: '' }))
  fails(createMultaSchema.safeParse({ tournamentId: 3, playerId: 'p1', reason: 'x', pointsPenalty: 'abc' }))
  assert.deepEqual(updateMultaSchema.parse({ chipsAmount: null, paid: true }), { chipsAmount: null, paid: true })
  fails(updateMultaSchema.safeParse({ paid: 'si' }))
  assert.deepEqual(multasQuerySchema.parse({ tournamentId: '3' }), { tournamentId: 3 })
  fails(multasQuerySchema.safeParse({ tournamentId: 'abc' }))
})

test('push devices', () => {
  const token = 'ExponentPushToken[abc123]'
  assert.deepEqual(registerPushDeviceSchema.parse({ expoToken: token, platform: 'ios' }), { expoToken: token, platform: 'ios' })
  fails(registerPushDeviceSchema.safeParse({ expoToken: token, platform: 'web' }))
  fails(registerPushDeviceSchema.safeParse({ expoToken: 'abc', platform: 'android' }))
  assert.equal(unregisterPushDeviceSchema.safeParse({ expoToken: 'ExpoPushToken[x]' }).success, true)
  fails(unregisterPushDeviceSchema.safeParse({}))
})

test('notificaciones', () => {
  assert.equal(sendNotificationSchema.safeParse({ playerId: 'p1', title: 'Hola', body: 'x' }).success, true)
  fails(sendNotificationSchema.safeParse({ title: 'Hola', body: 'x' }))
  assert.equal(broadcastNotificationSchema.safeParse({ title: 'a', body: 'b', targetRoles: ['Enfermo'] }).success, true)
  fails(broadcastNotificationSchema.safeParse({ title: 'a', body: 'b', targetRoles: ['Nadie'] }))
  fails(testNotificationSchema.safeParse({ title: '', body: 'b' }))
  const sub = { subscription: { endpoint: 'https://push', keys: { p256dh: 'k', auth: 'a' } } }
  assert.equal(pushSubscriptionSchema.safeParse(sub).success, true)
  fails(pushSubscriptionSchema.safeParse({ subscription: { endpoint: 'https://push' } }))
  fails(unsubscribeQuerySchema.safeParse({}))
  assert.deepEqual(notificationHistoryQuerySchema.parse({}), { page: 1, limit: 20 })
  assert.deepEqual(notificationHistoryQuerySchema.parse({ page: '2', limit: '5' }), { page: 2, limit: 5 })
  fails(notificationHistoryQuerySchema.safeParse({ limit: '500' }))
  fails(notificationHistoryQuerySchema.safeParse({ page: '0' }))
  const cfg = notificationConfigSchema.parse({ settings: { tournament_activated: { isEnabled: true, timing: 'immediate', extra: 1 } } })
  assert.equal((cfg.settings.tournament_activated as Record<string, unknown>).extra, 1)
  fails(notificationConfigSchema.safeParse({ settings: { x: { isEnabled: 'si' } } }))
  fails(notificationConfigSchema.safeParse({}))
})
