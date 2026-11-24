/**
 * Del estado que manda el servidor a lo que se ve, con el motor de
 * @poker/shared. Funciones puras: sin React, sin red.
 *
 * El servidor no manda el ancla sino una foto ya resuelta (nivel, cuánto
 * falta, hora del servidor). Con los niveles del torneo se reconstruye un
 * ancla equivalente y se le pasa a resolveTimer(): así el teléfono avanza de
 * nivel solo aunque se quede sin red, y no hay contador local que se desfase.
 * Todo se calcula en el reloj del servidor (corrigiendo el desfase del
 * teléfono) y se devuelve también en el reloj local para programar avisos.
 */
import { resolveTimer, type BlindSpec, type TimerAnchor, type TimerStatus } from '@poker/shared';

import type { TimerSnapshot } from './types';

/** Snapshot + instante local en que llegó (para medir el desfase de reloj). */
export interface TimerEntry {
  snapshot: TimerSnapshot;
  receivedAt: number;
}

export interface TimerDisplay {
  status: TimerStatus;
  level: number;
  smallBlind: number | null;
  bigBlind: number | null;
  nextLevel: number | null;
  nextSmallBlind: number | null;
  nextBigBlind: number | null;
  remainingMs: number;
  elapsedInLevelMs: number;
  /** Instante del cambio en el reloj del TELÉFONO. null si no corre. */
  levelEndsAtLocal: number | null;
  isUnlimited: boolean;
  isLastLevel: boolean;
}

/**
 * Pausa de cena: la estructura estándar (blinds.ts de @poker/shared) la
 * marca al terminar el nivel 6 y se hace con pausa manual. No hay un campo en
 * la base para esto; si la estructura cambia, se cambia aquí.
 */
export const DINNER_AFTER_LEVEL = 6;

/** Desfase servidor − teléfono, en ms. */
export function clockOffset(entry: TimerEntry): number {
  const server = Date.parse(entry.snapshot.serverNow);
  return Number.isFinite(server) ? server - entry.receivedAt : 0;
}

export function computeTimerView(entry: TimerEntry, levels: BlindSpec[], nowLocal: number): TimerDisplay {
  const s = entry.snapshot;
  const offset = clockOffset(entry);
  const spec = levels.find((l) => l.level === s.level);

  if (spec && s.status !== 'inactive') {
    const anchor: TimerAnchor = {
      status: s.status,
      anchorLevel: s.level,
      anchorElapsedMs: spec.durationMs === 0 ? 0 : Math.max(0, spec.durationMs - s.remainingMs),
      anchorAt: s.status === 'active' ? new Date(s.serverNow) : null,
    };
    const v = resolveTimer(anchor, levels, new Date(nowLocal + offset));
    return {
      status: v.status,
      level: v.level,
      smallBlind: v.blind?.smallBlind ?? null,
      bigBlind: v.blind?.bigBlind ?? null,
      nextLevel: v.nextBlind?.level ?? null,
      nextSmallBlind: v.nextBlind?.smallBlind ?? null,
      nextBigBlind: v.nextBlind?.bigBlind ?? null,
      remainingMs: v.remainingMs,
      elapsedInLevelMs: v.elapsedInLevelMs,
      levelEndsAtLocal: v.levelEndsAt ? v.levelEndsAt.getTime() - offset : null,
      isUnlimited: v.isUnlimited,
      isLastLevel: v.isLastLevel,
    };
  }

  // Sin niveles cargados (o timer sin empezar): lo mismo que hace la web, la
  // diferencia contra el instante de cambio que manda el servidor.
  const endsAtServer = s.levelEndsAt ? Date.parse(s.levelEndsAt) : NaN;
  const running = s.status === 'active' && Number.isFinite(endsAtServer);
  const remainingMs = running ? Math.max(0, endsAtServer - (nowLocal + offset)) : s.remainingMs;
  return {
    status: s.status,
    level: s.level,
    smallBlind: s.smallBlind,
    bigBlind: s.bigBlind,
    nextLevel: s.nextLevel,
    nextSmallBlind: s.nextSmallBlind,
    nextBigBlind: s.nextBigBlind,
    remainingMs,
    elapsedInLevelMs: spec ? Math.max(0, spec.durationMs - remainingMs) : 0,
    levelEndsAtLocal: running ? endsAtServer - offset : null,
    isUnlimited: s.isUnlimited,
    isLastLevel: s.isLastLevel,
  };
}

/** Un cambio de nivel futuro, en el reloj del teléfono. */
export interface LevelBoundary {
  at: number;
  /** Nivel que termina. */
  fromLevel: number;
  /** Nivel que empieza. */
  level: number;
  smallBlind: number;
  bigBlind: number;
}

/**
 * Próximos cambios de nivel si nadie toca nada. Sirve para programar las
 * notificaciones locales de toda la noche de una vez: el teléfono puede estar
 * en el bolsillo con la app dormida y el aviso igual llega a su hora.
 */
export function upcomingBoundaries(view: TimerDisplay, levels: BlindSpec[], max = 24): LevelBoundary[] {
  if (view.status !== 'active' || view.levelEndsAtLocal == null || view.isUnlimited) return [];

  const out: LevelBoundary[] = [];
  if (levels.length === 0) {
    if (view.nextLevel != null && view.nextSmallBlind != null && view.nextBigBlind != null) {
      out.push({
        at: view.levelEndsAtLocal,
        fromLevel: view.level,
        level: view.nextLevel,
        smallBlind: view.nextSmallBlind,
        bigBlind: view.nextBigBlind,
      });
    }
    return out;
  }

  let at = view.levelEndsAtLocal;
  let current = view.level;
  while (out.length < max) {
    const next = levels.find((l) => l.level > current);
    if (!next) break;
    out.push({
      at,
      fromLevel: current,
      level: next.level,
      smallBlind: next.smallBlind,
      bigBlind: next.bigBlind,
    });
    if (next.durationMs === 0) break;
    at += next.durationMs;
    current = next.level;
  }
  return out;
}

/** mm:ss a partir de milisegundos (igual que formatRemaining de la web). */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 10000 → "10.000": en la mesa se lee mejor con separador. */
export function formatChips(value: number | null | undefined): string {
  if (value == null) return '—';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** ¿Está en la pausa de cena? Pausado justo al cerrar el nivel 6 o al abrir el 7. */
export function isDinnerBreak(view: TimerDisplay): boolean {
  if (view.status !== 'paused') return false;
  if (view.level === DINNER_AFTER_LEVEL && !view.isUnlimited && view.remainingMs <= 60_000) return true;
  return view.level === DINNER_AFTER_LEVEL + 1 && view.elapsedInLevelMs <= 60_000;
}
