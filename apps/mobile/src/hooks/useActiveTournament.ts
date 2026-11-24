/**
 * Torneo activo. Réplica de src/hooks/useActiveTournament.ts de la web, misma
 * key y mismos campos derivados (sin los console.log de depuración).
 */
import useSWR from 'swr';

import { ApiError } from '@/lib/api';
import { swrKeys } from '@/lib/swr';

export interface ActiveTournament {
  id: number;
  name: string;
  number: number;
  status: 'PROXIMO' | 'ACTIVO' | 'FINALIZADO';
  startDate?: string;
  endDate?: string;
  participantCount?: number;
  completedDates?: number;
  totalDates?: number;
  /** Cuántas peores fechas descarta el ELIMINA (2 en T29, 3 en T30). */
  datesToEliminate?: number;
}

export interface TournamentDateRef {
  id: number;
  dateNumber: number;
  scheduledDate: string | null;
  status?: string;
}

interface ActiveTournamentResponse {
  tournament: ActiveTournament;
  stats: {
    completedDates: number;
    totalDates: number;
    nextDate?: TournamentDateRef;
    lastCompletedDate?: TournamentDateRef | null;
    startDate?: string;
    endDate?: string;
    isCompleted: boolean;
  };
}

export function useActiveTournament(options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 300000 } = options;
  const swr = useSWR<ActiveTournamentResponse>(swrKeys.activeTournament(), { refreshInterval });
  const data = swr.data;
  const tournament = data?.tournament;

  return {
    ...swr,
    tournament,
    isLoading: !swr.error && !data,
    isNotFound: swr.error instanceof ApiError && swr.error.status === 404,
    progress: tournament
      ? {
          completed: data?.stats.completedDates ?? 0,
          total: data?.stats.totalDates ?? 12,
        }
      : null,
    nextDate: data?.stats.nextDate ?? null,
    lastCompletedDate: data?.stats.lastCompletedDate ?? null,
    seasonStartDate: data?.stats.startDate ?? null,
    seasonEndDate: data?.stats.endDate ?? null,
  };
}
