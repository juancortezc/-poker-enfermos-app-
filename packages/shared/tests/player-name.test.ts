import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  playerLabel, shortenFullName, fullName, playerCardUrl, photoForTournament, displayPhoto, withTournamentPhotos,
  GUEST_PHOTO_URL, T30_GUEST_PHOTO_URL,
} from '../src/index'

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

test('photoForTournament: antes del T31 la foto vieja, desde el T31 la actual', () => {
  const lulu = 'https://storage.googleapis.com/poker-enfermos/t31/perfil/lulu.webp'
  assert.equal(photoForTournament(lulu, 30), 'https://storage.googleapis.com/poker-enfermos/lulu.png')
  assert.equal(photoForTournament(lulu, 31), lulu)
  assert.equal(photoForTournament('https://x/otra.png', 28), 'https://x/otra.png')
  assert.equal(photoForTournament(null, 28), null)
})

test('displayPhoto: invitados con el pato vigente, salvo que ya venga el pato viejo', () => {
  assert.equal(displayPhoto('https://x/cualquiera.png', 'Invitado'), GUEST_PHOTO_URL)
  assert.equal(displayPhoto(T30_GUEST_PHOTO_URL, 'Invitado'), T30_GUEST_PHOTO_URL)
  assert.equal(displayPhoto('https://x/a.png', 'Enfermo'), 'https://x/a.png')
  assert.equal(displayPhoto(undefined, 'Enfermo'), null)
  // tarjeta: el pato viejo no tiene tarjeta, el vigente si
  assert.equal(playerCardUrl(T30_GUEST_PHOTO_URL, 'Invitado'), null)
})

test('withTournamentPhotos: cambia toda foto del T31 en una respuesta de un torneo anterior', () => {
  const lulu = 'https://storage.googleapis.com/poker-enfermos/t31/perfil/lulu.webp'
  const cuando = new Date('2026-11-01T00:00:00Z')
  const data = {
    rankings: [{ playerPhoto: lulu, name: 'Lulu' }],
    elim: { eliminatedPlayer: { photoUrl: GUEST_PHOTO_URL }, at: cuando },
    otra: 'https://x/otra.png',
  }
  const old = withTournamentPhotos(data, 30)
  assert.equal(old.rankings[0].playerPhoto, 'https://storage.googleapis.com/poker-enfermos/lulu.png')
  assert.equal(old.elim.eliminatedPlayer.photoUrl, T30_GUEST_PHOTO_URL)
  assert.equal(old.elim.at, cuando)
  assert.equal(old.otra, 'https://x/otra.png')
  assert.equal(data.rankings[0].playerPhoto, lulu, 'no muta la entrada')
  assert.equal(withTournamentPhotos(data, 31), data)
  assert.equal(withTournamentPhotos(data, undefined), data)
  assert.deepEqual(withTournamentPhotos(old, 30), old)
})
