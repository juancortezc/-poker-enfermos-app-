import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leaderPhrase, nightWinnerPhrase, PHRASE_BANKS, rivalryPhrase } from '../src/index'

test('phrases: ningun banco mide 1 ni un multiplo de 7 (si no, se repetirian fechas seguidas)', () => {
  for (const [name, bank] of Object.entries(PHRASE_BANKS)) {
    assert.ok(bank.length > 1 && bank.length % 7 !== 0, name)
  }
})

test('phrases: dos fechas seguidas nunca repiten frase, y la misma fecha da siempre la misma', () => {
  for (let n = 1; n < 40; n++) {
    for (const wins of [undefined, 1, 3]) {
      assert.notDeepEqual(nightWinnerPhrase('Lulu', n, wins), nightWinnerPhrase('Lulu', n + 1, wins))
      assert.deepEqual(nightWinnerPhrase('Lulu', n, wins), nightWinnerPhrase('Lulu', n, wins))
    }
    for (const changed of [true, false]) {
      assert.notDeepEqual(leaderPhrase('Jackie', n, changed), leaderPhrase('Jackie', n + 1, changed))
    }
  }
})

test('phrases: pone el nombre y no deja marcadores', () => {
  const [a, b] = nightWinnerPhrase('Milton', 14, 1)
  assert.ok(`${a} ${b}`.includes('Milton'))
  assert.ok(!`${a} ${b}`.includes('{'))
  assert.equal(rivalryPhrase(0), '¡EMPATADOS EN LA CIMA!')
  assert.equal(rivalryPhrase(1), '¡A UN PUNTO DEL CINTURÓN!')
  assert.equal(rivalryPhrase(5), '¡A 5 PUNTOS DEL CINTURÓN!')
})
