/**
 * timer-view: de la foto del servidor a lo que se ve en el teléfono.
 * Casos de la mesa: reloj del teléfono desfasado, cambio de nivel sin red,
 * pausa de cena después del nivel 6 y el último nivel sin límite.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultBlindLevels, toBlindSpecs } from '@poker/shared';

import {
  computeTimerView,
  DINNER_AFTER_LEVEL,
  formatChips,
  formatRemaining,
  isDinnerBreak,
  upcomingBoundaries,
  type TimerEntry,
} from '../src/components/envivo/timer-view';
import type { TimerSnapshot } from '../src/components/envivo/types';

const MIN = 60_000;
const SERVER_T0 = Date.parse('2026-11-20T01:00:00Z');
const LEVELS = toBlindSpecs(defaultBlindLevels());

function snapshot(partial: Partial<TimerSnapshot>): TimerSnapshot {
  const level = partial.level ?? 1;
  const spec = LEVELS.find((l) => l.level === level)!;
  const next = LEVELS.find((l) => l.level > level) ?? null;
  return {
    status: 'active',
    level,
    smallBlind: spec.smallBlind,
    bigBlind: spec.bigBlind,
    nextLevel: next?.level ?? null,
    nextSmallBlind: next?.smallBlind ?? null,
    nextBigBlind: next?.bigBlind ?? null,
    remainingMs: spec.durationMs,
    levelEndsAt: null,
    isUnlimited: spec.durationMs === 0,
    isLastLevel: next == null,
    serverNow: new Date(SERVER_T0).toISOString(),
    ...partial,
  };
}

/** El teléfono recibe la foto en su propio reloj, `skewMs` adelantado. */
function entry(s: TimerSnapshot, skewMs = 0): TimerEntry {
  return { snapshot: s, receivedAt: Date.parse(s.serverNow) + skewMs };
}

test('reloj del teléfono 7 minutos adelantado: la cuenta sigue la del servidor', () => {
  const skew = 7 * MIN;
  const e = entry(snapshot({ level: 3, remainingMs: 5 * MIN }), skew);
  const v = computeTimerView(e, LEVELS, e.receivedAt + 30_000);
  assert.equal(v.level, 3);
  assert.equal(v.remainingMs, 5 * MIN - 30_000);
  // El aviso se programa en el reloj del teléfono.
  assert.equal(v.levelEndsAtLocal, SERVER_T0 + skew + 5 * MIN);
});

test('reloj atrasado: mismo resultado', () => {
  const e = entry(snapshot({ level: 2, remainingMs: 2 * MIN }), -3 * MIN);
  const v = computeTimerView(e, LEVELS, e.receivedAt + MIN);
  assert.equal(v.remainingMs, MIN);
  assert.equal(v.levelEndsAtLocal, SERVER_T0 - 3 * MIN + 2 * MIN);
});

test('sin una foto nueva, pasa solo al nivel siguiente al vencer', () => {
  const e = entry(snapshot({ level: 1, remainingMs: 10_000 }));
  const v = computeTimerView(e, LEVELS, e.receivedAt + 10_000 + 5_000);
  assert.equal(v.level, 2);
  assert.equal(v.smallBlind, 100);
  assert.equal(v.remainingMs, 12 * MIN - 5_000);
  assert.equal(v.elapsedInLevelMs, 5_000);
});

test('justo en el límite cuenta como el nivel nuevo, con su duración completa', () => {
  const e = entry(snapshot({ level: 1, remainingMs: 10_000 }));
  const v = computeTimerView(e, LEVELS, e.receivedAt + 10_000);
  assert.equal(v.level, 2);
  assert.equal(v.remainingMs, 12 * MIN);
});

test('pausado no corre aunque pase el tiempo', () => {
  const e = entry(snapshot({ status: 'paused', level: 4, remainingMs: 3 * MIN }));
  const v = computeTimerView(e, LEVELS, e.receivedAt + 60 * MIN);
  assert.equal(v.level, 4);
  assert.equal(v.remainingMs, 3 * MIN);
  assert.equal(v.levelEndsAtLocal, null);
});

test('último nivel sin límite: no hay cuenta ni cambios programados', () => {
  const last = LEVELS[LEVELS.length - 1];
  assert.equal(last.durationMs, 0);
  const e = entry(snapshot({ level: last.level, remainingMs: 0 }));
  const v = computeTimerView(e, LEVELS, e.receivedAt + 5 * 60 * MIN);
  assert.equal(v.level, last.level);
  assert.equal(v.isUnlimited, true);
  assert.equal(v.isLastLevel, true);
  assert.equal(v.status, 'active');
  assert.equal(v.levelEndsAtLocal, null);
  assert.deepEqual(upcomingBoundaries(v, LEVELS), []);
});

test('del 17 al 18 sin límite: entra y se queda', () => {
  const e = entry(snapshot({ level: 17, remainingMs: MIN }));
  const v = computeTimerView(e, LEVELS, e.receivedAt + 3 * 60 * MIN);
  assert.equal(v.level, 18);
  assert.equal(v.isUnlimited, true);
  assert.equal(v.remainingMs, 0);
});

test('estructura terminada (último nivel finito vencido) da completed', () => {
  const finite = toBlindSpecs([
    { level: 1, smallBlind: 50, bigBlind: 100, duration: 10 },
    { level: 2, smallBlind: 100, bigBlind: 200, duration: 10 },
  ]);
  const s = snapshot({ level: 2, remainingMs: MIN, smallBlind: 100, bigBlind: 200 });
  const e = entry(s);
  const v = computeTimerView(e, finite, e.receivedAt + 2 * MIN);
  assert.equal(v.status, 'completed');
  assert.equal(v.remainingMs, 0);
  assert.deepEqual(upcomingBoundaries(v, finite), []);
});

test('sin niveles cargados usa levelEndsAt del servidor (como la web)', () => {
  const endsAt = new Date(SERVER_T0 + 4 * MIN).toISOString();
  const e = entry(snapshot({ level: 5, remainingMs: 4 * MIN, levelEndsAt: endsAt }), 2 * MIN);
  const v = computeTimerView(e, [], e.receivedAt + MIN);
  assert.equal(v.remainingMs, 3 * MIN);
  assert.equal(v.levelEndsAtLocal, SERVER_T0 + 4 * MIN + 2 * MIN);
  const b = upcomingBoundaries(v, []);
  assert.equal(b.length, 1);
  assert.equal(b[0].level, 6);
});

test('upcomingBoundaries: toda la noche, en orden y hasta el nivel sin límite', () => {
  const e = entry(snapshot({ level: 5, remainingMs: 2 * MIN }));
  const v = computeTimerView(e, LEVELS, e.receivedAt);
  const b = upcomingBoundaries(v, LEVELS);
  assert.equal(b[0].fromLevel, 5);
  assert.equal(b[0].level, 6);
  assert.equal(b[0].at, e.receivedAt + 2 * MIN);
  assert.equal(b[1].at, b[0].at + 12 * MIN); // lo que dura el 6
  assert.equal(b[2].at, b[1].at + 16 * MIN); // lo que dura el 7
  assert.equal(b[b.length - 1].level, 18);
  assert.equal(b.length, 13);
  for (let i = 1; i < b.length; i++) assert.ok(b[i].at > b[i - 1].at);
});

test('upcomingBoundaries: pausado no programa nada', () => {
  const e = entry(snapshot({ status: 'paused', level: 5, remainingMs: 2 * MIN }));
  assert.deepEqual(upcomingBoundaries(computeTimerView(e, LEVELS, e.receivedAt), LEVELS), []);
});

test('upcomingBoundaries respeta el máximo', () => {
  const e = entry(snapshot({ level: 1 }));
  assert.equal(upcomingBoundaries(computeTimerView(e, LEVELS, e.receivedAt), LEVELS, 3).length, 3);
});

test('pausa de cena: pausado al cerrar el 6 o al abrir el 7', () => {
  assert.equal(DINNER_AFTER_LEVEL, 6);
  const at = (s: Partial<TimerSnapshot>) => {
    const e = entry(snapshot(s));
    return computeTimerView(e, LEVELS, e.receivedAt);
  };
  assert.equal(isDinnerBreak(at({ status: 'paused', level: 6, remainingMs: 30_000 })), true);
  assert.equal(isDinnerBreak(at({ status: 'paused', level: 7, remainingMs: 16 * MIN - 20_000 })), true);
  // Pausa a mitad de nivel: no es la cena.
  assert.equal(isDinnerBreak(at({ status: 'paused', level: 6, remainingMs: 5 * MIN })), false);
  assert.equal(isDinnerBreak(at({ status: 'paused', level: 7, remainingMs: 10 * MIN })), false);
  // Corriendo nunca es pausa.
  assert.equal(isDinnerBreak(at({ status: 'active', level: 7, remainingMs: 16 * MIN })), false);
  // La pausa de otro nivel no es la cena.
  assert.equal(isDinnerBreak(at({ status: 'paused', level: 3, remainingMs: 10_000 })), false);
});

test('formatRemaining', () => {
  assert.equal(formatRemaining(0), '00:00');
  assert.equal(formatRemaining(-5_000), '00:00');
  assert.equal(formatRemaining(59_000), '00:59');
  assert.equal(formatRemaining(12 * MIN), '12:00');
  assert.equal(formatRemaining(75 * MIN), '75:00');
});

test('formatChips', () => {
  assert.equal(formatChips(null), '—');
  assert.equal(formatChips(undefined), '—');
  assert.equal(formatChips(0), '0');
  assert.equal(formatChips(800), '800');
  assert.equal(formatChips(1000), '1.000');
  assert.equal(formatChips(10000), '10.000');
  assert.equal(formatChips(1234567), '1.234.567');
});
