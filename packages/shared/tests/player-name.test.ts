import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playerLabel, shortenFullName, fullName } from '../src/index'

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
