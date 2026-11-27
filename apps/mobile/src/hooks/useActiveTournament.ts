/**
 * Torneo activo. Réplica de src/hooks/useActiveTournament.ts de la web, misma
 * key y mismos campos derivados (sin los console.log de depuración).
 */
import useSWR from 'swr';

import { ApiError } from '@/lib/api';
import { swrKeys } from '@/lib/swr';

/**
 * `tournament` de GET /api/tournaments/active: la fila de Tournament tal cual
 * (más gameDates, tournamentParticipants, blindLevels y _count, que aquí no se
 * tipan porque ninguna pantalla los lee de esta respuesta). Sin torneo ACTIVO
 * la API devuelve el más reciente, que puede estar FINALIZADO.
 */
export interface ActiveTournament {
  id: number;
  name: string;
  number: number;
  status: 'PROXIMO' | 'ACTIVO' | 'FINALIZADO';
  participantIds: string[];
  /** Fechas planificadas (columna del torneo; la cuenta real va en `stats.totalDates`). */
  totalDates: number;
  /** Cuántas peores fechas descarta el ELIMINA (2 en T29, 3 en T30). */
  datesToEliminate: number;
  createdAt: string;
  updatedAt: string;
}

/** `nextDate` es la GameDate entera (pending o CREATED); `lastCompletedDate` trae solo estos tres campos. */
export interface TournamentDateRef {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status?: string;
}

/** Una fecha jugada con el torneo al que pertenece. */
export interface LastPlayedDate extends TournamentDateRef {
  tournamentId: number;
  tournamentNumber: number;
}

/**
 * Sin ningún torneo en la base la API responde `{ tournament: null }`, sin
 * `stats`. `nextDate` falta cuando no quedan fechas por jugar (torneo
 * terminado) y `startDate`/`endDate` cuando el torneo no tiene fechas.
 */
interface ActiveTournamentResponse {
  tournament: ActiveTournament | null;
  stats?: {
    completedDates: number;
    totalDates: number;
    nextDate?: TournamentDateRef;
    lastCompletedDate: TournamentDateRef | null;
    /** Última fecha jugada del grupo, aunque sea del torneo anterior (al arrancar uno). Falta en APIs viejas. */
    lastPlayedDate?: LastPlayedDate | null;
    startDate?: string;
    endDate?: string;
    isCompleted: boolean;
  };
}

export function useActiveTournament(options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 300000 } = options;
  const swr = useSWR<ActiveTournamentResponse>(swrKeys.activeTournament(), { refreshInterval });
  const data = swr.data;
  const tournament = data?.tournament ?? undefined;

  return {
    ...swr,
    tournament,
    isLoading: !swr.error && !data,
    isNotFound: swr.error instanceof ApiError && swr.error.status === 404,
    progress: tournament
      ? {
          completed: data?.stats?.completedDates ?? 0,
          total: data?.stats?.totalDates ?? 12,
        }
      : null,
    nextDate: data?.stats?.nextDate ?? null,
    lastCompletedDate: data?.stats?.lastCompletedDate ?? null,
    // Del torneo activo o, si todavía no jugó ninguna, del anterior. Con una
    // API que no la manda, la del torneo activo.
    lastPlayedDate:
      data?.stats?.lastPlayedDate ??
      (data?.stats?.lastCompletedDate && tournament
        ? { ...data.stats.lastCompletedDate, tournamentId: tournament.id, tournamentNumber: tournament.number }
        : null),
    seasonStartDate: data?.stats?.startDate ?? null,
    seasonEndDate: data?.stats?.endDate ?? null,
    isFinished: tournament?.status === 'FINALIZADO',
  };
}
