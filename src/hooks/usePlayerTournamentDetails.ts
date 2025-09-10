import { useState, useEffect } from 'react';

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
}

export function usePlayerTournamentDetails(playerId: string, tournamentId: number) {
  const [details, setDetails] = useState<PlayerTournamentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playerId && tournamentId) {
      fetchPlayerDetails();
    }
  }, [playerId, tournamentId]);

  const fetchPlayerDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all required data in parallel
      const [playerResponse, rankingResponse, datesResponse] = await Promise.all([
        fetch(`/api/players/${playerId}/public`),
        fetch(`/api/tournaments/${tournamentId}/ranking`),
        fetch(`/api/tournaments/${tournamentId}/dates/public`)
      ]);

      if (!playerResponse.ok || !rankingResponse.ok || !datesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const player = await playerResponse.json();
      const rankingData = await rankingResponse.json();
      const datesData = await datesResponse.json();

      // Find this player in the ranking
      const playerRanking = rankingData.rankings.find((r: any) => r.playerId === playerId);
      
      if (!playerRanking) {
        throw new Error('Player not found in tournament ranking');
      }

      // Process dates and get elimination details for completed ones
      const datePerformance = await Promise.all(
        datesData.map(async (date: any) => {
          const baseDate = {
            dateNumber: date.dateNumber,
            status: date.status,
            points: playerRanking.pointsByDate[date.dateNumber] || 0,
          };

          // Only fetch elimination details for completed dates
          if (date.status === 'completed' && date.id) {
            try {
              const eliminationsResponse = await fetch(`/api/eliminations/game-date/${date.id}`);
              if (eliminationsResponse.ok) {
                const eliminations = await eliminationsResponse.json();
                
                // Find if this player was eliminated
                const playerElimination = eliminations.find((e: any) => e.eliminatedPlayerId === playerId);
                
                if (playerElimination) {
                  // Player was eliminated
                  return {
                    ...baseDate,
                    eliminationPosition: playerElimination.position,
                    eliminatedBy: {
                      name: playerElimination.eliminatorPlayer ? 
                        `${playerElimination.eliminatorPlayer.firstName} ${playerElimination.eliminatorPlayer.lastName}` : 
                        'Desconocido',
                      alias: playerElimination.eliminatorPlayer?.firstName || '',
                      isGuest: false // TODO: Determinar si es invitado
                    }
                  };
                } else {
                  // Player was not eliminated - could be winner or absent
                  const totalPlayers = date.playerIds?.length || 0;
                  const eliminatedCount = eliminations.length;
                  
                  // Check if player was absent (0 points)
                  if (baseDate.points === 0) {
                    return {
                      ...baseDate,
                      isAbsent: true
                    };
                  }
                  
                  if (eliminatedCount === totalPlayers - 1) {
                    // Player won (has points and only one left)
                    return {
                      ...baseDate,
                      eliminationPosition: undefined, // Winner doesn't have elimination position
                      eliminatedBy: undefined
                    };
                  }
                }
              }
            } catch (err) {
              console.error(`Error fetching eliminations for date ${date.id}:`, err);
            }
          }

          return baseDate;
        })
      );

      // Calculate ranking evolution
      const rankingEvolution = calculateRankingEvolution(playerRanking.pointsByDate, rankingData.rankings, playerId);

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
        rankingEvolution
      });

    } catch (err) {
      console.error('Error fetching player details:', err);
      setError(err instanceof Error ? err.message : 'Error fetching player details');
    } finally {
      setLoading(false);
    }
  };

  return { details, loading, error, refetch: fetchPlayerDetails };
}

// Helper function to calculate ranking evolution
function calculateRankingEvolution(
  playerPointsByDate: { [dateNumber: number]: number },
  allRankings: any[],
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