import { prisma } from './prisma';
import { calculatePointsForPosition } from './tournament-utils';

export interface PlayerRanking {
  position: number;
  playerId: string;
  playerName: string;
  playerAlias?: string;
  playerPhoto?: string;
  totalPoints: number;
  datesPlayed: number;
  pointsByDate: { [dateNumber: number]: number }; // Puntos por cada fecha
  trend: 'up' | 'down' | 'same'; // Tendencia respecto a ranking anterior
}

export interface TournamentRankingData {
  tournament: {
    id: number;
    name: string;
    number: number;
    totalDates: number;
    completedDates: number;
  };
  rankings: PlayerRanking[];
  lastUpdated: Date;
}

/**
 * Calcula el ranking completo de un torneo para jugadores registrados solamente
 */
export async function calculateTournamentRanking(tournamentId: number): Promise<TournamentRankingData | null> {
  try {
    // Obtener el torneo con sus participantes y fechas completadas
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        tournamentParticipants: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                aliases: true,
                photoUrl: true
              }
            }
          }
        },
        gameDates: {
          where: {
            status: { in: ['completed', 'in_progress'] }
          },
          include: {
            eliminations: {
              include: {
                eliminatedPlayer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: {
            dateNumber: 'asc'
          }
        }
      }
    });

    if (!tournament) {
      return null;
    }

    // Obtener solo los jugadores registrados (participantes del torneo)
    const registeredPlayers = tournament.tournamentParticipants.map(tp => ({
      id: tp.player.id,
      name: `${tp.player.firstName} ${tp.player.lastName}`,
      alias: tp.player.aliases?.[0] || '',
      photo: tp.player.photoUrl || null,
      role: tp.player.role
    }));

    // Calcular puntos por jugador por fecha
    const playerRankings = new Map<string, PlayerRanking>();

    // Inicializar rankings para todos los jugadores registrados
    registeredPlayers.forEach(player => {
      playerRankings.set(player.id, {
        position: 0, // Se calculará después
        playerId: player.id,
        playerName: player.name,
        playerAlias: player.alias,
        playerPhoto: player.photo,
        totalPoints: 0,
        datesPlayed: 0,
        pointsByDate: {},
        trend: 'same'
      });
    });

    // Procesar cada fecha completada
    tournament.gameDates.forEach(gameDate => {
      const totalPlayersInDate = gameDate.playerIds.length;
      
      // Registrar puntos para jugadores que participaron
      gameDate.playerIds.forEach(playerId => {
        if (registeredPlayers.some(rp => rp.id === playerId)) {
          const ranking = playerRankings.get(playerId)!;
          ranking.datesPlayed += 1;
          
          // Buscar si fue eliminado en esta fecha
          const elimination = gameDate.eliminations.find(e => e.eliminatedPlayerId === playerId);
          
          if (elimination) {
            // Jugador fue eliminado, usar puntos guardados en la eliminación
            ranking.pointsByDate[gameDate.dateNumber] = elimination.points;
            ranking.totalPoints += elimination.points;
          } else {
            // Jugador no fue eliminado
            // Solo asignar puntos si es el único jugador restante (ganador) o la fecha está completada
            const eliminatedCount = gameDate.eliminations.length;
            const activePlayersCount = totalPlayersInDate - eliminatedCount;
            
            if (activePlayersCount === 1 || gameDate.status === 'completed') {
              // Es el ganador - calcular puntos
              const secondPlace = gameDate.eliminations.find(e => e.position === 2);
              const winnerPoints = secondPlace 
                ? secondPlace.points + 3 
                : calculatePointsForPosition(1, totalPlayersInDate);
              
              ranking.pointsByDate[gameDate.dateNumber] = winnerPoints;
              ranking.totalPoints += winnerPoints;
            } else {
              // Aún jugando, no tiene puntos todavía
              ranking.pointsByDate[gameDate.dateNumber] = 0;
              // No sumar a totalPoints (permanece sin cambios)
            }
          }
        }
      });

      // Para jugadores registrados que NO participaron en esta fecha: 0 puntos
      registeredPlayers.forEach(player => {
        if (!gameDate.playerIds.includes(player.id)) {
          const ranking = playerRankings.get(player.id)!;
          ranking.pointsByDate[gameDate.dateNumber] = 0;
          // totalPoints no cambia (no suma ni resta)
        }
      });
    });

    // Ordenar por puntos totales (descendente) y asignar posiciones
    const sortedRankings = Array.from(playerRankings.values())
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Asignar posiciones (manejar empates)
    let currentPosition = 1;
    sortedRankings.forEach((ranking, index) => {
      if (index > 0 && sortedRankings[index - 1].totalPoints > ranking.totalPoints) {
        currentPosition = index + 1;
      }
      ranking.position = currentPosition;
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        number: tournament.number,
        totalDates: 12, // Siempre 12 fechas por torneo
        completedDates: tournament.gameDates.length
      },
      rankings: sortedRankings,
      lastUpdated: new Date()
    };

  } catch (error) {
    console.error('Error calculating tournament ranking:', error);
    return null;
  }
}

/**
 * Obtiene el ranking de un jugador específico en un torneo
 */
export async function getPlayerRankingInTournament(tournamentId: number, playerId: string): Promise<PlayerRanking | null> {
  const rankingData = await calculateTournamentRanking(tournamentId);
  if (!rankingData) return null;

  return rankingData.rankings.find(r => r.playerId === playerId) || null;
}

/**
 * Obtiene los jugadores registrados de un torneo (para filtrar ranking)
 */
export async function getTournamentRegisteredPlayers(tournamentId: number) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!tournament) return [];

  return tournament.tournamentParticipants.map(tp => ({
    id: tp.player.id,
    name: `${tp.player.firstName} ${tp.player.lastName}`,
    role: tp.player.role
  }));
}