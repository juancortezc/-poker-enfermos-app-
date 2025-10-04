import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useTournamentRanking } from './useTournamentRanking';
import { useGameDates } from './useGameDates';
import { swrKeys } from '@/lib/swr-config';
import { buildAuthHeaders } from '@/lib/client-auth';

interface PlayerPublicData {
  id: string;
  firstName: string;
  lastName: string;
  aliases: string[];
  photoUrl?: string;
  lastVictoryDate?: string;
}

interface PlayerTournamentDetails {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    aliases: string[];
    photoUrl?: string;
    lastVictoryDate?: string;
  };
  currentStats: {
    position: number;
    totalPoints: number;
    pointsByDate: { [dateNumber: number]: number };
    elimina1?: number;
    elimina2?: number;
    finalScore?: number;
  };
  datePerformance: Array<{
    dateNumber: number;
    status: 'completed' | 'in_progress' | 'pending' | 'CREATED';
    eliminationPosition?: number;
    eliminatedBy?: {
      name: string;
      alias?: string;
      isGuest: boolean;
    };
    points: number;
    rankingPosition?: number;
    isAbsent?: boolean;
  }>;
  rankingEvolution: Array<{
    dateNumber: number;
    position: number;
    points: number;
  }>;
  bestResult: string;
}

interface EliminationRecord {
  eliminatedPlayerId: string;
  position: number;
  points: number;
  eliminatorPlayer?: {
    firstName: string;
    lastName: string;
  } | null;
}

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
    refreshInterval: 30000
  });

  const {
    gameDates,
    isLoading: datesLoading,
    isError: datesHasError,
    errorMessage: datesErrorMessage,
    refresh: refreshDates
  } = useGameDates(tournamentId, {
    refreshInterval: 30000
  });

  const {
    data: player,
    error: playerError,
    isLoading: playerLoading,
    mutate: refreshPlayer
  } = useSWR<PlayerPublicData>(
    playerId ? swrKeys.playerDetails(playerId) : null
  );

  useEffect(() => {
    if (!playerId || !tournamentId) {
      setDetails(null);
      setLoading(false);
      return;
    }

    if (rankingLoading || datesLoading || playerLoading) {
      return;
    }

    if (!rankingData || !player || !gameDates) {
      return;
    }

    let cancelled = false;

    const buildDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const playerRanking = rankingData.rankings.find(r => r.playerId === playerId);

        if (!playerRanking) {
          throw new Error('Player not found in tournament ranking');
        }

        const eliminationMap = new Map<number, EliminationRecord[]>();

        const completedDates = gameDates.filter(date => date.status === 'completed' && date.id);

        if (completedDates.length > 0) {
          const eliminationResponses = await Promise.all(
            completedDates.map(async date => {
              const response = await fetch(`/api/eliminations/game-date/${date.id}`, {
                headers: buildAuthHeaders(),
                cache: 'no-store'
              });

              if (!response.ok) {
                throw new Error('Failed to fetch eliminations');
              }

              const eliminations: EliminationRecord[] = await response.json();
              return { dateId: date.id, eliminations };
            })
          );

          eliminationResponses.forEach(({ dateId, eliminations }) => {
            eliminationMap.set(dateId, eliminations);
          });
        }

        const computeFallbackPosition = (dateNumber: number) => {
          if (!rankingData?.rankings?.length) return null;

          const playersForDate = rankingData.rankings
            .map(ranking => ({
              playerId: ranking.playerId,
              points: ranking.pointsByDate?.[dateNumber]
            }))
            .filter(entry => entry.points !== undefined && entry.points !== null);

          if (!playersForDate.length) return null;

          playersForDate.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
          const index = playersForDate.findIndex(entry => entry.playerId === playerId);

          return index === -1 ? null : index + 1;
        };

        const datePerformance = await Promise.all(
          gameDates.map(async date => {
            const baseDate = {
              dateNumber: date.dateNumber,
              status: date.status,
              points: playerRanking.pointsByDate[date.dateNumber] || 0
            };

            if (date.status === 'completed' && date.id) {
              const eliminations = eliminationMap.get(date.id) || [];

              const playerElimination = eliminations.find(e => e.eliminatedPlayerId === playerId);

              if (playerElimination) {
                return {
                  ...baseDate,
                  eliminationPosition: playerElimination.position,
                  eliminatedBy: playerElimination.eliminatorPlayer ? {
                    name: `${playerElimination.eliminatorPlayer.firstName} ${playerElimination.eliminatorPlayer.lastName}`,
                    alias: playerElimination.eliminatorPlayer.firstName || '',
                    isGuest: false
                  } : undefined
                };
              }

              const totalPlayers = date.playerIds?.length || 0;
              const eliminatedCount = eliminations.length;

              if (baseDate.points === 0) {
                return {
                  ...baseDate,
                  isAbsent: true
                };
              }

              if (eliminatedCount === totalPlayers - 1) {
                return {
                  ...baseDate,
                  eliminationPosition: undefined,
                  eliminatedBy: undefined
                };
              }
            }

            const fallbackPosition = computeFallbackPosition(date.dateNumber);

            if (fallbackPosition) {
              return {
                ...baseDate,
                eliminationPosition: fallbackPosition,
                eliminatedBy: undefined
              };
            }

            return baseDate;
          })
        );

        const rankingEvolution = calculateRankingEvolution(
          playerRanking.pointsByDate,
          rankingData.rankings,
          playerId
        );

        let bestResultLabel = 'Sin datos';
        let bestNumericPosition = Number.POSITIVE_INFINITY;

        datePerformance
          .filter(date => date.status === 'completed' && !date.isAbsent)
          .forEach(date => {
            const numericPosition = date.eliminationPosition ?? 1;
            if (numericPosition < bestNumericPosition) {
              bestNumericPosition = numericPosition;
              bestResultLabel = numericPosition === 1 ? 'Ganador' : `${numericPosition}° lugar`;
            }
          });

        if (bestNumericPosition === Number.POSITIVE_INFINITY) {
          bestResultLabel = 'Sin participación';
        }

        if (!cancelled) {
          setDetails({
            player: {
              id: player.id,
              firstName: player.firstName,
              lastName: player.lastName,
              aliases: player.aliases || [],
              photoUrl: player.photoUrl,
              lastVictoryDate: player.lastVictoryDate
            },
            currentStats: {
              position: playerRanking.position,
              totalPoints: playerRanking.totalPoints,
              pointsByDate: playerRanking.pointsByDate,
              elimina1: playerRanking.elimina1,
              elimina2: playerRanking.elimina2,
              finalScore: playerRanking.finalScore
            },
            datePerformance: datePerformance.sort((a, b) => a.dateNumber - b.dateNumber),
            rankingEvolution,
            bestResult: bestResultLabel
          });
        }
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
  }, [
    playerId,
    tournamentId,
    rankingData,
    rankingLoading,
    gameDates,
    datesLoading,
    player,
    playerLoading
  ]);

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

// Helper function to calculate ranking evolution
function calculateRankingEvolution(
  playerPointsByDate: { [dateNumber: number]: number },
  allRankings: Array<{ playerId: string; [key: string]: unknown }>,
  targetPlayerId: string
): Array<{ dateNumber: number; position: number; points: number }> {
  const evolution: Array<{ dateNumber: number; position: number; points: number }> = [];
  
  // Get all date numbers that have been played by anyone
  const allPlayedDates = new Set<number>();
  allRankings.forEach(ranking => {
    Object.keys(ranking.pointsByDate).forEach(date => {
      allPlayedDates.add(Number(date));
    });
  });
  
  const sortedDates = Array.from(allPlayedDates).sort((a, b) => a - b);
  
  sortedDates.forEach(dateNumber => {
    // Calculate cumulative points up to this date for the target player
    const cumulativePoints = sortedDates
      .filter(d => d <= dateNumber)
      .reduce((sum, d) => sum + (playerPointsByDate[d] || 0), 0);
    
    // Calculate what the ranking would be after this date
    const rankingsAtDate = allRankings.map(ranking => {
      const cumulativePointsAtDate = sortedDates
        .filter(d => d <= dateNumber)
        .reduce((sum, d) => sum + (ranking.pointsByDate[d] || 0), 0);
      
      return {
        playerId: ranking.playerId,
        points: cumulativePointsAtDate
      };
    }).sort((a, b) => b.points - a.points);
    
    // Find the target player's ranking position
    const position = rankingsAtDate.findIndex(r => r.playerId === targetPlayerId) + 1;
    
    evolution.push({
      dateNumber,
      position: position > 0 ? position : allRankings.length + 1,
      points: cumulativePoints
    });
  });
  
  return evolution;
}
