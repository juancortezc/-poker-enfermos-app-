/**
 * Detalle de un jugador en el torneo. Igual que usePlayerTournamentDetails de
 * la web, el armado lo hace `buildPlayerTournamentDetails` de @poker/shared a
 * partir del ranking, las fechas con eliminaciones y los datos públicos.
 *
 * Diferencia: aquí basta `/api/tournaments/[id]/dates` (trae `playerIds` y
 * `status`), no hace falta además `/dates/public`.
 */
import { buildPlayerTournamentDetails, type PlayerPublicData, type PlayerTournamentDetails } from '@poker/shared';
import { useMemo } from 'react';
import useSWR from 'swr';

import { useTournamentDates } from '@/hooks/useTournamentDates';
import { useTournamentRanking } from '@/hooks/useTournamentRanking';
import { swrKeys } from '@/lib/swr';

export function usePlayerTournamentDetails(playerId: string | undefined, tournamentId: number | null | undefined) {
  const rankingSwr = useTournamentRanking(tournamentId);
  const datesSwr = useTournamentDates(tournamentId);
  const playerSwr = useSWR<PlayerPublicData>(playerId ? swrKeys.playerDetails(playerId) : null);

  const ranking = rankingSwr.data;
  const dates = datesSwr.data;
  const player = playerSwr.data;

  const built = useMemo((): { details: PlayerTournamentDetails | null; error: string | null } => {
    if (!playerId || !ranking || !dates || !player) return { details: null, error: null };
    try {
      return {
        details: buildPlayerTournamentDetails({
          playerId,
          ranking,
          gameDates: dates,
          datesWithEliminations: dates,
          player,
        }),
        error: null,
      };
    } catch (e) {
      return { details: null, error: e instanceof Error ? e.message : 'Error' };
    }
  }, [playerId, ranking, dates, player]);

  return {
    details: built.details,
    /** El jugador no figura en la tabla del torneo (p.ej. un invitado). */
    notInRanking: built.error !== null,
    ranking,
    dates: datesSwr.dates,
    player,
    isLoading: !built.details && !built.error && !rankingSwr.error && !datesSwr.error && !playerSwr.error,
    error: rankingSwr.error ?? datesSwr.error ?? playerSwr.error,
    refresh: () => Promise.all([rankingSwr.mutate(), datesSwr.mutate(), playerSwr.mutate()]),
  };
}
