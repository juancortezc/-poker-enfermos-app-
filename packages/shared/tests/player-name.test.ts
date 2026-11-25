import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playerLabel, shortenFullName, fullName, playerCardUrl } from '../src/index'

test('playerLabel: alias, inicial en mayuscula y sin apellido', () => {
  assert.equal(playerLabel({ firstName: 'Juan', lastName: 'cortez' }), 'Juan C.')
  assert.equal(playerLabel({ firstName: 'Juan', lastName: 'Cortez', aliases: [' Mono '] }), 'Mono C.')
  assert.equal(playerLabel({ firstName: 'Juan', lastName: null }), 'Juan')
  assert.equal(playerLabel({ firstName: 'Juan', lastName: '   ' }), 'Juan')
  // alias vacio no gana; solo se mira el primero
  assert.equal(playerLabel({ firstName: 'Juan', lastName: 'Toral', aliases: ['', 'Otro'] }), 'Juan T.')
  assert.equal(playerLabel({ firstName: 'Ángel', lastName: 'ñuñez' }), 'Ángel Ñ.')
})

test('shortenFullName: conserva nombres compuestos', () => {
  assert.equal(shortenFullName('Juan Fernando Ochoa'), 'Juan Fernando O.')
  assert.equal(shortenFullName('  Juan   Antonio   cortez '), 'Juan Antonio C.')
  assert.equal(shortenFullName('Juan'), 'Juan')
  assert.equal(shortenFullName(''), '')
  assert.equal(shortenFullName('   '), '')
  assert.equal(shortenFullName(null), '')
  assert.equal(shortenFullName(undefined), '')
})

test('fullName', () => {
  assert.equal(fullName({ firstName: 'Juan', lastName: 'Cortez' }), 'Juan Cortez')
  assert.equal(fullName({ firstName: 'Juan', lastName: null }), 'Juan')
  assert.equal(fullName({ firstName: 'Juan', lastName: '' }), 'Juan')
})

test('playerCardUrl: tarjeta del T31 desde la foto de perfil, pato para invitados, null si no hay', () => {
  const base = 'https://storage.googleapis.com/poker-enfermos/t31'
  assert.equal(playerCardUrl(`${base}/perfil/lulu.webp`), `${base}/tarjetas/lulu.webp`)
  assert.equal(playerCardUrl('https://storage.googleapis.com/poker-enfermos/lulu.png'), null)
  assert.equal(playerCardUrl(null), null)
  assert.equal(playerCardUrl('cualquiera', 'Invitado'), `${base}/tarjetas/pato-1.webp`)
})
