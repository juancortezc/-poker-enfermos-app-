/**
 * Formas de las respuestas de la API que usan el timer y el registro.
 * Copiadas de la web (lib/timer-service.ts, app/registro/page.tsx,
 * lib/live-ranking.ts) para no importar código de Next en la app.
 */
import type { TimerStatus } from '@poker/shared';

/** GET/POST /api/timer/[gameDateId]. Fechas en ISO. */
export interface TimerSnapshot {
  status: TimerStatus;
  level: number;
  smallBlind: number | null;
  bigBlind: number | null;
  nextSmallBlind: number | null;
  nextBigBlind: number | null;
  nextLevel: number | null;
  remainingMs: number;
  levelEndsAt: string | null;
  isUnlimited: boolean;
  isLastLevel: boolean;
  serverNow: string;
  /**
   * Estructura de blinds del torneo (duración en minutos). La manda la API
   * desde backend-2; una API anterior no la trae y el hook pide el torneo.
   */
  blindLevels?: TimerBlindLevel[];
}

export interface TimerBlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  duration: number;
}

export type TimerAction = 'start' | 'pause' | 'resume' | 'restart-level' | 'advance';

/** GET /api/game-dates/active (null si no hay fecha CREATED o in_progress). */
export interface ActiveGameDate {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status: 'pending' | 'CREATED' | 'in_progress' | 'completed' | 'cancelled';
  playerIds: string[];
  tournament: { id: number; name: string; number: number };
  playersCount: number;
}

export interface DatePlayer {
  id: string;
  firstName: string;
  lastName: string;
}

/** GET /api/eliminations/game-date/[id]. */
export interface Elimination {
  id: number;
  gameDateId: number;
  position: number;
  points: number;
  eliminatedPlayer: DatePlayer;
  eliminatorPlayer: DatePlayer | null;
  eliminationTime: string | null;
}

/** GET /api/game-dates/[id]/live-ranking (subconjunto que se muestra). */
export interface LiveRankingRow {
  playerId: string;
  playerName: string;
  position: number;
  positionsChanged: number;
  score: number;
  todayPoints: number;
  todayAbsorbed: boolean;
  state: 'eliminated' | 'playing' | 'absent';
  eliminationPosition?: number;
}

export interface LiveRankingData {
  gameDate: {
    id: number;
    dateNumber: number;
    totalPlayers: number;
    playersRemaining: number;
    eliminationsCount: number;
  };
  projection: {
    nextPosition: number;
    nextPoints: number;
    winnerPoints: number;
    eliminasActive: boolean;
    datesToEliminate: number;
  };
  lastElimination: {
    playerName: string;
    eliminatorName: string;
    position: number;
    points: number;
  } | null;
  rows: LiveRankingRow[];
}
