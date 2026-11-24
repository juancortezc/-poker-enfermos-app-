/**
 * Tabla ELIMINA del torneo y rachas de temporada. Mismas keys que la web
 * (useTournamentRanking / useTournamentInsights).
 */
import type { TournamentInsightsData, TournamentRankingData } from '@poker/shared';
import useSWR from 'swr';

import { swrKeys } from '@/lib/swr';

export function useTournamentRanking(tournamentId: number | null | undefined, options: { refreshInterval?: number } = {}) {
  const { refreshInterval = 30000 } = options;
  const swr = useSWR<TournamentRankingData>(
    tournamentId ? swrKeys.tournamentRanking(tournamentId) : null,
    { refreshInterval }
  );
  return {
    ...swr,
    ranking: swr.data,
    isLoading: !!tournamentId && !swr.error && !swr.data,
  };
}

export function useTournamentInsights(tournamentId: number | null | undefined) {
  const swr = useSWR<TournamentInsightsData>(
    tournamentId ? swrKeys.tournamentInsights(tournamentId) : null,
    { refreshInterval: 60000 }
  );
  return { ...swr, insights: swr.data };
}
