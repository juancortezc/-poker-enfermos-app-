import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizePin,
  isValidPinForLogin,
  isValidPinForCreation,
  PIN_MIN_LENGTH_LOGIN,
  PIN_MIN_LENGTH_NEW,
  PIN_MAX_LENGTH,
  PIN_RULE_TEXT,
} from '../src/index'

test('constantes', () => {
  assert.equal(PIN_MIN_LENGTH_LOGIN, 4)
  assert.equal(PIN_MIN_LENGTH_NEW, 6)
  assert.equal(PIN_MAX_LENGTH, 12)
  assert.equal(PIN_RULE_TEXT, 'Entre 6 y 12 caracteres, solo letras y números')
})

test('normaliza: recorta y pasa a minusculas', () => {
  assert.equal(normalizePin('  AbC123 '), 'abc123')
  assert.equal(normalizePin('\t1234\n'), '1234')
  assert.equal(normalizePin(' 123456 '), '123456') // espacio duro del teclado
  assert.equal(normalizePin(''), '')
})

test('login: limites de longitud 4..12', () => {
  assert.equal(isValidPinForLogin('123'), false)
  assert.equal(isValidPinForLogin('1234'), true)
  assert.equal(isValidPinForLogin(' 1234 '), true)
  assert.equal(isValidPinForLogin('a'.repeat(12)), true)
  assert.equal(isValidPinForLogin('a'.repeat(13)), false)
  assert.equal(isValidPinForLogin(''), false)
  assert.equal(isValidPinForLogin('    '), false)
})

test('creacion: limites de longitud 6..12', () => {
  assert.equal(isValidPinForCreation('12345'), false)
  assert.equal(isValidPinForCreation('123456'), true)
  assert.equal(isValidPinForCreation('ABCDEF'), true) // se normaliza
  assert.equal(isValidPinForCreation('abcdef123456'), true)
  assert.equal(isValidPinForCreation('abcdef1234567'), false)
  // los espacios de los bordes no cuentan para la longitud
  assert.equal(isValidPinForCreation('  12345  '), false)
})

test('rechaza espacios internos, simbolos y unicode', () => {
  for (const pin of ['ab cd12', 'abc\t123', 'abc-123', 'abc_123', 'ñandú1', 'café12', '１２３４５６', 'İstanbul', '😀😀😀😀😀😀', 'abc12​3']) {
    assert.equal(isValidPinForLogin(pin), false, `login ${JSON.stringify(pin)}`)
    assert.equal(isValidPinForCreation(pin), false, `creacion ${JSON.stringify(pin)}`)
  }
})

test('una clave valida para crear tambien sirve para entrar', () => {
  for (const pin of ['123456', 'Abc123', 'zzzzzzzzzzzz']) {
    assert.equal(isValidPinForCreation(pin), true)
    assert.equal(isValidPinForLogin(pin), true)
  }
})
