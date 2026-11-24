/**
 * Fecha activa (CREATED o in_progress). Réplica de useActiveGameDate de la
 * web: la API responde `null` cuando no hay ninguna.
 */
import useSWR from 'swr';

import { swrKeys } from '@/lib/swr';

export interface ActiveGameDate {
  id: number;
  dateNumber: number;
  scheduledDate: string | null;
  status: 'CREATED' | 'in_progress';
  playerIds: string[];
  playersCount: number;
  tournament: { id: number; name: string; number: number };
}

export function useActiveGameDate(options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 30000 } = options;
  const swr = useSWR<ActiveGameDate | null>(swrKeys.activeGameDate(), { refreshInterval });
  const gameDate = swr.data ?? null;

  return {
    ...swr,
    gameDate,
    isLoading: !swr.error && swr.data === undefined,
    hasActiveGameDate: !!gameDate,
    isInProgress: gameDate?.status === 'in_progress',
  };
}
