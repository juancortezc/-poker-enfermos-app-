import useSWR from 'swr';

import { swrKeys } from '@/lib/swr';

import type { ActiveGameDate } from './types';

/** Fecha CREATED o in_progress (igual que useActiveGameDate de la web). */
export function useActiveGameDate(refreshInterval = 30_000) {
  const { data, error, isLoading, mutate } = useSWR<ActiveGameDate | null>(swrKeys.activeGameDate(), {
    refreshInterval,
    dedupingInterval: 5_000,
  });
  return { gameDate: data ?? null, error, isLoading, refresh: mutate };
}
