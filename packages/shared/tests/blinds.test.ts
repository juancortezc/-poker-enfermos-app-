import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_BLIND_LEVELS,
  defaultBlindLevels,
  TOURNAMENT_PRESETS,
  getPresetById,
  getPresetOptions,
  calculateTournamentDuration,
  validatePresetStructure,
  toBlindSpecs,
} from '../src/index'

// La estructura que tiene el Torneo 30 en produccion (GET /api/tournaments/3).
const T30 = [
  [50, 100, 12], [100, 200, 12], [150, 300, 12], [200, 400, 12], [300, 600, 12], [400, 800, 12],
  [500, 1000, 16], [600, 1200, 16], [800, 1600, 16], [1000, 2000, 16], [1500, 3000, 16], [2000, 4000, 16],
  [3000, 6000, 16], [4000, 8000, 16], [5000, 10000, 10], [6000, 12000, 10], [8000, 16000, 10], [10000, 20000, 0],
]

test('la estructura estandar es la del grupo (18 niveles, el ultimo sin limite)', () => {
  assert.deepEqual(DEFAULT_BLIND_LEVELS.map((l) => [l.smallBlind, l.bigBlind, l.duration]), T30)
  assert.deepEqual(DEFAULT_BLIND_LEVELS.map((l) => l.level), T30.map((_, i) => i + 1))
  assert.deepEqual(getPresetById('standard')?.blindLevels, defaultBlindLevels())
})

test('progresion valida: bb = 2 sb y estrictamente creciente', () => {
  for (const preset of TOURNAMENT_PRESETS) {
    preset.blindLevels.forEach((l) => assert.equal(l.bigBlind, l.smallBlind * 2, `${preset.id} nivel ${l.level}`))
    assert.deepEqual(validatePresetStructure(preset.blindLevels), { isValid: true, issues: [] }, preset.id)
  }
})

test('defaultBlindLevels entrega copias: editar una no toca la fuente ni el preset', () => {
  const a = defaultBlindLevels()
  a[0].smallBlind = 999
  a.push({ level: 19, smallBlind: 1, bigBlind: 2, duration: 1 })
  assert.equal(DEFAULT_BLIND_LEVELS[0].smallBlind, 50)
  assert.equal(DEFAULT_BLIND_LEVELS.length, 18)
  assert.equal(defaultBlindLevels()[0].smallBlind, 50)
  assert.equal(getPresetById('standard')?.blindLevels[0].smallBlind, 50)
})

test('presets: busqueda y opciones', () => {
  assert.equal(getPresetById('no-existe'), null)
  assert.equal(getPresetById(''), null)
  assert.deepEqual(getPresetOptions().map((o) => o.value), TOURNAMENT_PRESETS.map((p) => p.id))
})

test('duracion estimada: el nivel sin limite cuenta 30 min', () => {
  // 6*12 + 8*16 + 3*10 + 30 = 260 min
  assert.equal(calculateTournamentDuration(defaultBlindLevels()), '4h 20min')
  assert.equal(calculateTournamentDuration([]), '0 min')
  assert.equal(calculateTournamentDuration([{ level: 1, smallBlind: 1, bigBlind: 2, duration: 60 }]), '1h')
  assert.equal(calculateTournamentDuration([{ level: 1, smallBlind: 1, bigBlind: 2, duration: 0 }]), '30 min')
})

test('validatePresetStructure detecta pocos niveles, retrocesos y saltos grandes', () => {
  const r = validatePresetStructure([
    { level: 1, smallBlind: 100, bigBlind: 200, duration: 10 },
    { level: 2, smallBlind: 50, bigBlind: 100, duration: 10 },
    { level: 3, smallBlind: 500, bigBlind: 1000, duration: 10 },
  ])
  assert.equal(r.isValid, false)
  assert.ok(r.issues.some((i) => i.includes('pocos niveles')))
  assert.ok(r.issues.some((i) => i.startsWith('Nivel 2')))
  assert.ok(r.issues.some((i) => i.startsWith('Nivel 3') && i.includes('10.0x')))
})

test('la estructura estandar alimenta al motor del timer sin perder niveles', () => {
  const specs = toBlindSpecs(defaultBlindLevels())
  assert.equal(specs.length, 18)
  assert.equal(specs[0].durationMs, 12 * 60_000)
  assert.equal(specs[17].durationMs, 0)
})
