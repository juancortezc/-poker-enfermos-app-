import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toBlindSpecs,
  resolveTimer,
  initialAnchor,
  startTimer,
  pauseTimer,
  resumeTimer,
  restartLevel,
  advanceLevel,
  type TimerAnchor,
} from '../src/index'

const MIN = 60_000
const T0 = new Date('2026-01-01T20:00:00Z').getTime()
const at = (ms: number) => new Date(T0 + ms)

// 3 niveles de 10 min y un ultimo nivel finito de 5 min
const finitos = toBlindSpecs([
  { level: 3, smallBlind: 150, bigBlind: 300, duration: 10 },
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 10 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 10 },
  { level: 4, smallBlind: 200, bigBlind: 400, duration: 5 },
])
// el ultimo sin limite (duracion 0), como el preset estandar
const conFinal = toBlindSpecs([
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 10 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 0 },
])

test('toBlindSpecs ordena por nivel, pasa a ms y recorta negativos a 0', () => {
  assert.deepEqual(finitos.map((l) => l.level), [1, 2, 3, 4])
  assert.equal(finitos[0].durationMs, 10 * MIN)
  const neg = toBlindSpecs([{ level: 1, smallBlind: 1, bigBlind: 2, duration: -3 }])
  assert.equal(neg[0].durationMs, 0)
  assert.deepEqual(toBlindSpecs([]), [])
})

test('inactivo o sin niveles: vista vacia', () => {
  const v = resolveTimer(initialAnchor(), finitos, at(0))
  assert.equal(v.status, 'inactive')
  assert.equal(v.blind, null)
  assert.equal(v.remainingMs, 0)
  const s = startTimer([], at(0))
  assert.equal(s.anchorLevel, 1)
  assert.equal(resolveTimer(s, [], at(5 * MIN)).blind, null)
})

test('borde exacto de nivel: 1 ms antes sigue, en el ms exacto ya cambio', () => {
  const a = startTimer(finitos, at(0))
  const antes = resolveTimer(a, finitos, at(10 * MIN - 1))
  assert.equal(antes.level, 1)
  assert.equal(antes.remainingMs, 1)
  const justo = resolveTimer(a, finitos, at(10 * MIN))
  assert.equal(justo.level, 2)
  assert.equal(justo.elapsedInLevelMs, 0)
  assert.equal(justo.remainingMs, 10 * MIN)
  assert.equal(justo.levelEndsAt?.getTime(), T0 + 20 * MIN)
  assert.equal(justo.nextBlind?.level, 3)
})

test('se acaba la estructura: completed en el ultimo nivel, sin restante', () => {
  const a = startTimer(finitos, at(0))
  const fin = resolveTimer(a, finitos, at(35 * MIN))
  assert.equal(fin.status, 'completed')
  assert.equal(fin.level, 4)
  assert.equal(fin.remainingMs, 0)
  assert.equal(fin.levelEndsAt, null)
  assert.equal(fin.isLastLevel, true)
  // un dia despues sigue igual
  assert.deepEqual(resolveTimer(a, finitos, at(24 * 60 * MIN)), fin)
})

test('nivel sin limite detiene el avance', () => {
  const a = startTimer(conFinal, at(0))
  const v = resolveTimer(a, conFinal, at(500 * MIN))
  assert.equal(v.status, 'active')
  assert.equal(v.level, 2)
  assert.equal(v.isUnlimited, true)
  assert.equal(v.remainingMs, 0)
  assert.equal(v.levelEndsAt, null)
  assert.equal(v.elapsedInLevelMs, 490 * MIN)
})

test('pausar en el borde exacto deja el nivel siguiente con 0 transcurrido', () => {
  const a = startTimer(finitos, at(0))
  const p = pauseTimer(a, finitos, at(10 * MIN))
  assert.deepEqual(p, { status: 'paused', anchorLevel: 2, anchorElapsedMs: 0, anchorAt: null })
})

test('la cena: una pausa larga no consume tiempo, y reanudar sigue donde quedo', () => {
  const a = startTimer(finitos, at(0))
  const p = pauseTimer(a, finitos, at(7 * MIN))
  const durante = resolveTimer(p, finitos, at(7 * MIN + 30 * MIN))
  assert.equal(durante.level, 1)
  assert.equal(durante.remainingMs, 3 * MIN)
  assert.equal(durante.levelEndsAt, null)
  const r = resumeTimer(p, at(37 * MIN))
  const despues = resolveTimer(r, finitos, at(40 * MIN))
  assert.equal(despues.level, 2)
  assert.equal(despues.elapsedInLevelMs, 0)
})

test('acciones idempotentes y sin mutar', () => {
  const a = startTimer(finitos, at(0))
  const copia = { ...a }
  const p1 = pauseTimer(a, finitos, at(3 * MIN))
  const p2 = pauseTimer(p1, finitos, at(9 * MIN))
  assert.equal(p2, p1)
  assert.deepEqual(a, copia)
  const r1 = resumeTimer(p1, at(4 * MIN))
  assert.equal(resumeTimer(r1, at(8 * MIN)), r1)
  // reanudar algo inactivo no lo arranca
  const ini = initialAnchor()
  assert.equal(resumeTimer(ini, at(0)), ini)
  assert.equal(pauseTimer(ini, finitos, at(0)), ini)
  assert.equal(advanceLevel(ini, finitos, at(0)), ini)
  assert.equal(restartLevel(ini, finitos, at(0)), ini)
})

test('reloj del cliente atrasado respecto al ancla: nunca transcurrido negativo', () => {
  const a = startTimer(finitos, at(5 * MIN))
  const v = resolveTimer(a, finitos, at(0))
  assert.equal(v.level, 1)
  assert.equal(v.elapsedInLevelMs, 0)
  assert.equal(v.remainingMs, 10 * MIN)
})

test('ancla con transcurrido negativo se trata como 0', () => {
  const a: TimerAnchor = { status: 'paused', anchorLevel: 2, anchorElapsedMs: -999, anchorAt: null }
  assert.equal(resolveTimer(a, finitos, at(0)).elapsedInLevelMs, 0)
})

test('ancla en un nivel inexistente cae al ultimo', () => {
  const a: TimerAnchor = { status: 'paused', anchorLevel: 99, anchorElapsedMs: 0, anchorAt: null }
  assert.equal(resolveTimer(a, finitos, at(0)).level, 4)
})

test('advanceLevel: adelanta, conserva la pausa y en el ultimo no hace nada', () => {
  const a = startTimer(finitos, at(0))
  const adv = advanceLevel(a, finitos, at(2 * MIN))
  assert.deepEqual(adv, { status: 'active', anchorLevel: 2, anchorElapsedMs: 0, anchorAt: at(2 * MIN) })
  const p = pauseTimer(a, finitos, at(2 * MIN))
  assert.deepEqual(advanceLevel(p, finitos, at(3 * MIN)), { status: 'paused', anchorLevel: 2, anchorElapsedMs: 0, anchorAt: null })
  const enUltimo: TimerAnchor = { status: 'paused', anchorLevel: 4, anchorElapsedMs: 0, anchorAt: null }
  assert.equal(advanceLevel(enUltimo, finitos, at(0)), enUltimo)
})

test('restartLevel sobre completed vuelve a correr el ultimo nivel entero', () => {
  const done: TimerAnchor = { status: 'completed', anchorLevel: 4, anchorElapsedMs: 5 * MIN, anchorAt: null }
  const r = restartLevel(done, finitos, at(60 * MIN))
  assert.equal(r.status, 'active')
  assert.equal(r.anchorLevel, 4)
  const v = resolveTimer(r, finitos, at(61 * MIN))
  assert.equal(v.remainingMs, 4 * MIN)
})

test('una noche entera con pausas en todos los bordes suma exacto', () => {
  // corre 10 min, pausa justo en el borde, 30 min de cena, reanuda, corre 15
  let a = startTimer(finitos, at(0))
  a = pauseTimer(a, finitos, at(10 * MIN))
  a = resumeTimer(a, at(40 * MIN))
  const v = resolveTimer(a, finitos, at(55 * MIN))
  assert.equal(v.level, 3)
  assert.equal(v.elapsedInLevelMs, 5 * MIN)
})
