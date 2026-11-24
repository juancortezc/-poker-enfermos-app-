import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseProposalInput, isSafeImageUrl, PROPOSAL_IMAGE_URL_MAX } from '../src/lib/proposal-input'
import { checkUpload, MAX_UPLOAD_BYTES } from '../src/lib/image-upload'

const base = { title: ' T ', objective: 'O', situation: 'S', proposal: 'P' }

test('propuesta valida: recorta espacios e imageUrl vacia = null', () => {
  const r = parseProposalInput({ ...base, imageUrl: '  ' })
  assert.deepEqual(r, { ok: true, value: { title: 'T', objective: 'O', situation: 'S', proposal: 'P', imageUrl: null } })
})

test('campos que no son string o quedan vacios tras recortar', () => {
  for (const bad of [{ ...base, title: '   ' }, { ...base, objective: 5 }, { ...base, situation: ['x'] }, { ...base, proposal: null }]) {
    assert.equal(parseProposalInput(bad).ok, false)
  }
  for (const body of [null, 'x', [], 42]) assert.equal(parseProposalInput(body).ok, false)
})

test('limites de longitud', () => {
  assert.equal(parseProposalInput({ ...base, title: 'x'.repeat(201) }).ok, false)
  assert.equal(parseProposalInput({ ...base, title: 'x'.repeat(200) }).ok, true)
  assert.equal(parseProposalInput({ ...base, proposal: 'x'.repeat(3001) }).ok, false)
})

test('imageUrl: solo https y con tope', () => {
  const ok = 'https://abc.public.blob.vercel-storage.com/proposals/p/x.jpg'
  assert.equal(parseProposalInput({ ...base, imageUrl: ok }).ok, true)
  for (const bad of [
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'data:text/html,<script>alert(1)</script>',
    'http://example.com/a.png',
    'no es url',
    123,
    'https://e.com/' + 'a'.repeat(PROPOSAL_IMAGE_URL_MAX),
  ]) {
    assert.equal(parseProposalInput({ ...base, imageUrl: bad }).ok, false, String(bad))
    if (typeof bad === 'string') assert.equal(isSafeImageUrl(bad), false)
  }
  assert.equal(isSafeImageUrl(ok), true)
  assert.equal(isSafeImageUrl(null), false)
})

test('subida: solo png/jpeg/webp por bytes, maximo 1 MB', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  const html = new TextEncoder().encode('<html><script>alert(1)</script>')
  assert.deepEqual(checkUpload(png), { ok: true, image: { contentType: 'image/png', ext: 'png' } })
  assert.equal(checkUpload(jpg).ok, true)
  assert.equal(checkUpload(webp).ok, true)
  assert.deepEqual(checkUpload(gif), { ok: false, status: 415, error: 'Solo se aceptan imágenes PNG, JPEG o WebP' })
  assert.equal(checkUpload(html).ok, false)
  assert.equal(checkUpload(new Uint8Array()).ok, false)
  const big = new Uint8Array(MAX_UPLOAD_BYTES + 1)
  big.set(jpg)
  const r = checkUpload(big)
  assert.equal(r.ok === false && r.status, 413)
})
