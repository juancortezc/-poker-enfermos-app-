import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createGuestSchema,
  GUEST_GENERIC_NAME_MESSAGE,
  groupExternalGuests,
  guestInviterLabel,
  guestNameKey,
  isGenericGuestName,
  isGuestPlaceholder,
} from '../src/index'

const base = { firstName: '  Agustín ', lastName: ' Guerrero  ', inviterId: ' cmabc123 ' }

test('invitado: recorta nombre, apellido e invitador', () => {
  assert.deepEqual(createGuestSchema.parse(base), { firstName: 'Agustín', lastName: 'Guerrero', inviterId: 'cmabc123' })
})

test('invitado: nombre, apellido e invitador obligatorios, 2 letras minimo', () => {
  for (const bad of [
    { ...base, firstName: ' ' },
    { ...base, lastName: 'G' },
    { ...base, lastName: undefined },
    { ...base, inviterId: '' },
    { firstName: 'Ana', lastName: 'Lopez' },
  ]) {
    assert.equal(createGuestSchema.safeParse(bad).success, false, JSON.stringify(bad))
  }
  const r = createGuestSchema.safeParse({ ...base, inviterId: '  ' })
  assert.equal(r.success, false)
  assert.equal(r.error?.issues[0].message, 'Elige quién lo invita')
})

test('invitado: rechaza nombres de referencia sin importar mayusculas ni tildes', () => {
  const generic: [string, string][] = [
    ['Invitado', 'Uno'], ['INVITADO', 'Perez'], ['Desconocido', 'Lopez'], ['Juan', 'S/N'], ['Juan', 's/n'],
    ['Sobrino', 'Diego'], ['Sobrino Diego', 'Torres'], ['Hermano', 'Joto'], ['Carlos', 'jr'], ['Tío', 'Pepe'],
    ['Invitado 1', 'Perez'], ['Juan', 'X'], ['Ana', 'Lopez 2'],
  ]
  for (const [firstName, lastName] of generic) {
    const r = createGuestSchema.safeParse({ ...base, firstName, lastName })
    assert.equal(r.success, false, `${firstName} ${lastName}`)
    assert.ok(r.error?.issues.some((i) => i.message === GUEST_GENERIC_NAME_MESSAGE), `${firstName} ${lastName}`)
  }
  for (const ok of [['Agustín', 'Guerrero'], ['José Luis', 'De la Torre'], ['Ñaño', "O'Brien"], ['Xavier', 'Sánchez']]) {
    assert.equal(isGenericGuestName(ok[0]) || isGenericGuestName(ok[1]), false, ok.join(' '))
  }
})

test('clave de nombre: sin tildes, mayusculas ni espacios de mas', () => {
  assert.equal(guestNameKey(' Agustín ', 'GUERRERO  Díaz'), 'agustin guerrero diaz')
  assert.equal(guestNameKey('Agustin', 'Guerrero'), guestNameKey('AGUSTÍN', ' guerrero'))
})

test('comodines: "Invitado 1" e "Invitado 2 S/N"', () => {
  assert.equal(isGuestPlaceholder({ firstName: 'Invitado', lastName: '1' }), true)
  assert.equal(isGuestPlaceholder({ firstName: 'Invitado 2', lastName: 'S/N' }), true)
  assert.equal(isGuestPlaceholder({ firstName: 'invitado', lastName: '2 s/n' }), true)
  assert.equal(isGuestPlaceholder({ firstName: 'Invitado', lastName: 'Perez' }), false)
  assert.equal(isGuestPlaceholder({ firstName: 'Agustin', lastName: 'Guerrero' }), false)
})

test('selector: por participacion reciente, nunca jugados al final y comodines aparte', () => {
  const guests = [
    { id: 'a', firstName: 'Zoila', lastName: 'Vaca', lastPlayedAt: null },
    { id: 'b', firstName: 'Carlos', lastName: 'Guaman', lastPlayedAt: '2026-02-24T12:00:00.000Z' },
    { id: 'p', firstName: 'Invitado', lastName: '1', lastPlayedAt: '2026-09-30T12:00:00.000Z' },
    { id: 'c', firstName: 'Agustin', lastName: 'Guerrero', lastPlayedAt: '2026-09-15T12:00:00.000Z' },
    { id: 'd', firstName: 'Ana', lastName: 'Lopez', lastPlayedAt: null },
  ]
  const { named, placeholders } = groupExternalGuests(guests)
  assert.deepEqual(named.map((g) => g.id), ['c', 'b', 'd', 'a'])
  assert.deepEqual(placeholders.map((g) => g.id), ['p'])
})

test('etiqueta de invitador', () => {
  assert.equal(guestInviterLabel({ inviter: { firstName: 'Jorge', lastName: 'Perez' } }), 'invitado por Jorge Perez')
  assert.equal(guestInviterLabel({ inviter: null }), undefined)
  assert.equal(guestInviterLabel({}), undefined)
})
