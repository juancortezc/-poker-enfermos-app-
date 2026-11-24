import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useTournamentRanking } from './useTournamentRanking';
import { useGameDates } from './useGameDates';
import { swrKeys } from '@/lib/swr-config';

import {
  buildPlayerTournamentDetails,
  type DetailsDateWithEliminations,
  type PlayerPublicData,
  type PlayerTournamentDetails,
} from '@poker/shared';

// Los tipos y el armado viven en @poker/shared (los usa tambien la app movil).
export type { DatePerformance, PlayerTournamentDetails } from '@poker/shared';

export function usePlayerTournamentDetails(playerId: string, tournamentId: number) {
  const [details, setDetails] = useState<PlayerTournamentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    ranking: rankingData,
    isLoading: rankingLoading,
    isError: rankingHasError,
    errorMessage: rankingErrorMessage,
    refresh: refreshRanking
  } = useTournamentRanking(tournamentId, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const {
    gameDates,
    isLoading: datesLoading,
    isError: datesHasError,
    errorMessage: datesErrorMessage,
    refresh: refreshDates
  } = useGameDates(tournamentId, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Las eliminaciones de TODAS las fechas vienen embebidas aqui. Antes se pedia
  // una por fecha completada (Promise.all sobre N fechas = N requests en
  // paralelo, cada una con cache: 'no-store'). Esta es ademas la misma URL que
  // ya pide la pagina de perfil, asi que SWR la deduplica.
  const { data: datesWithEliminations } = useSWR<DetailsDateWithEliminations[]>(
    tournamentId ? `/api/tournaments/${tournamentId}/dates` : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const {
    data: player,
    error: playerError,
    isLoading: playerLoading,
    mutate: refreshPlayer
  } = useSWR<PlayerPublicData>(
    playerId ? swrKeys.playerDetails(playerId) : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  // Stable refs — avoid re-running the effect when SWR cache refreshes from parent
  const rankingDataRef = useRef(rankingData);
  rankingDataRef.current = rankingData;
  const gameDatesRef = useRef(gameDates);
  gameDatesRef.current = gameDates;
  const playerRef = useRef(player);
  playerRef.current = player;
  const datesWithEliminationsRef = useRef(datesWithEliminations);
  datesWithEliminationsRef.current = datesWithEliminations;

  const allReady = !rankingLoading && !datesLoading && !playerLoading
    && !!rankingData && !!gameDates && !!player && !!datesWithEliminations;

  useEffect(() => {
    if (!playerId || !tournamentId) {
      setDetails(null);
      setLoading(false);
      return;
    }

    if (!allReady) return;

    const rankingData = rankingDataRef.current;
    const gameDates = gameDatesRef.current;
    const player = playerRef.current;

    if (!rankingData || !gameDates || !player) return;

    let cancelled = false;

    const buildDetails = () => {
      setLoading(true);
      setError(null);

      try {
        const built = buildPlayerTournamentDetails({
          playerId,
          ranking: rankingData,
          gameDates,
          datesWithEliminations: datesWithEliminationsRef.current ?? [],
          player,
        });
        if (!cancelled) setDetails(built);
      } catch (err) {
        console.error('Error fetching player details:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error fetching player details');
          setDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    buildDetails();

    return () => {
      cancelled = true;
    };
  // Only re-run when player/tournament changes or when data becomes ready for the first time
  }, [playerId, tournamentId, allReady]);

  const combinedLoading = loading || rankingLoading || datesLoading || playerLoading;
  const combinedError = error
    || (rankingHasError ? rankingErrorMessage : null)
    || (datesHasError ? datesErrorMessage : null)
    || (playerError ? 'Error fetching player data' : null);

  const refetch = () => {
    const actions: Array<Promise<unknown>> = [];

    actions.push(refreshRanking());
    actions.push(refreshDates());

    if (playerId) {
      actions.push(refreshPlayer());
    }

    return Promise.all(actions).then(() => undefined);
  };

  return { details, loading: combinedLoading, error: combinedError, refetch };
}
