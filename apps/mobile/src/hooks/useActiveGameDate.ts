/**
 * Fecha activa (CREATED o in_progress). Una sola para Inicio, Timer y
 * Registro, todos con la misma key. Réplica de useActiveGameDate de la web.
 */
import useSWR from 'swr';

import { swrKeys } from '@/lib/swr';

/**
 * GET /api/game-dates/active. Responde `null` (no un 404) cuando no hay fecha
 * CREATED ni in_progress. `scheduledDate` es obligatorio en el esquema y llega
 * en ISO.
 */
export interface ActiveGameDate {
  id: number;
  dateNumber: number;
  scheduledDate: string;
  status: 'CREATED' | 'in_progress';
  playerIds: string[];
  playersCount: number;
  tournament: { id: number; name: string; number: number };
}

export function useActiveGameDate(options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 30_000 } = options;
  const swr = useSWR<ActiveGameDate | null>(swrKeys.activeGameDate(), {
    refreshInterval,
    // En la mesa importa ver rápido que la fecha arrancó o se cerró.
    dedupingInterval: 5_000,
  });
  const gameDate = swr.data ?? null;

  return {
    gameDate,
    error: swr.error,
    isLoading: swr.isLoading,
    mutate: swr.mutate,
    refresh: swr.mutate,
    hasActiveGameDate: !!gameDate,
    isInProgress: gameDate?.status === 'in_progress',
  };
}
