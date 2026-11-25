import { prisma } from './prisma';
import {
  calculatePointsForPosition,
  computeStandings,
  type PlayerRanking,
  type TournamentRankingData,
  type PlayerPositionDelta,
  type TournamentInsightsData,
} from '@poker/shared';
import { getPlayerPhotoUrl } from './player-utils';
import { getPointPenaltiesByPlayer } from './player-adjustments';

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
    // Usar getPlayerPhotoUrl para asegurar que invitados usen la imagen del pato
    const registeredPlayers = tournament.tournamentParticipants.map(tp => ({
      id: tp.player.id,
      name: `${tp.player.firstName} ${tp.player.lastName}`,
      alias: tp.player.aliases?.[0] || '',
      photo: getPlayerPhotoUrl(tp.player.photoUrl, tp.player.role) || null,
      role: tp.player.role
    }));

    // Multas de puntos (Multas/Ajustes) registradas para este torneo
    const pointPenalties = await getPointPenaltiesByPlayer(tournamentId);

    // La tabla en si (puntos por fecha, desempates, ELIMINA N, multas y
    // posiciones) vive en @poker/shared: el reporte de Excel la usa igual.
    const {
      rankings: sortedRankings,
      stillPlaying,
      datesToEliminate,
      eliminationThreshold,
    } = computeStandings(
      registeredPlayers.map(p => ({ id: p.id, name: p.name, alias: p.alias, photo: p.photo ?? undefined })),
      tournament.gameDates,
      { totalDates: tournament.totalDates, datesToEliminate: tournament.datesToEliminate, pointPenalties }
    );
    const playerRankings = new Map(sortedRankings.map(r => [r.playerId, r]));

    /**
     * PROYECCION DE LA FECHA EN CURSO
     *
     * A cada jugador que sigue en la mesa se le acreditan los puntos del
     * PROXIMO eliminado: es el piso garantizado si sale ahora mismo. Con eso
     * se recalcula su puntaje final y sus peores fechas, incluida la de hoy.
     *
     * Todo esto vive en `liveProjection` y no toca ni totalPoints ni finalScore
     * ni los elimina reales. La tabla de verdad sigue siendo la de las fechas
     * ya jugadas; esto es solo el "que pasaria si".
     */
    stillPlaying.forEach(({ playerId, dateNumber, totalPlayersInDate, eliminatedCount }) => {
      const ranking = playerRankings.get(playerId);
      if (!ranking) return;

      // Las posiciones se reparten del primer eliminado hacia la 1.
      const position = totalPlayersInDate - eliminatedCount;
      const points = position > 0 ? calculatePointsForPosition(position, totalPlayersInDate) : 0;

      const projectedScores = [
        ...Object.values(ranking.pointsByDate),
        points,
      ];
      const sorted = [...projectedScores].sort((a, b) => a - b);
      const worst = sorted.slice(0, datesToEliminate);
      const projectedTotal = ranking.totalPoints + points;
      const eliminasActive = projectedScores.length >= eliminationThreshold;

      ranking.liveProjection = {
        dateNumber,
        position,
        points,
        finalScore: eliminasActive
          ? projectedTotal - worst.reduce((sum, v) => sum + v, 0) - (ranking.pointPenalty ?? 0)
          : projectedTotal - (ranking.pointPenalty ?? 0),
        elimina1: worst[0],
        elimina2: worst[1],
        elimina3: worst[2],
        eliminasActive,
      };
    });

    // CALCULAR TENDENCIA (TREND): Comparar posición actual vs fecha anterior
    // Solo tiene sentido si hay al menos 2 fechas completadas
    if (tournament.gameDates.length >= 2) {
      try {
        // Clonar estructura de rankings para calcular posiciones de fecha anterior
        const previousRankings = new Map<string, number>(); // playerId -> posición anterior

        // Obtener todas las fechas excepto la última
        const previousGameDates = tournament.gameDates.slice(0, -1);

        // Recalcular puntos y posiciones SIN la última fecha
        const tempRankings = new Map<string, { totalPoints: number; finalScore?: number }>();

        // Inicializar rankings temporales
        registeredPlayers.forEach(player => {
          tempRankings.set(player.id, {
            totalPoints: 0,
            finalScore: undefined
          });
        });

        // Procesar fechas anteriores (sin la última)
        previousGameDates.forEach(gameDate => {
          const totalPlayersInDate = gameDate.playerIds.length;

          gameDate.playerIds.forEach(playerId => {
            if (registeredPlayers.some(rp => rp.id === playerId)) {
              const tempRanking = tempRankings.get(playerId)!;
              const elimination = gameDate.eliminations.find(e => e.eliminatedPlayerId === playerId);

              if (elimination) {
                tempRanking.totalPoints += elimination.points;
              } else {
                // Ganador
                const eliminatedCount = gameDate.eliminations.length;
                const activePlayersCount = totalPlayersInDate - eliminatedCount;

                if (activePlayersCount === 1) {
                  const secondPlace = gameDate.eliminations.find(e => e.position === 2);
                  const winnerPoints = secondPlace
                    ? secondPlace.points + 3
                    : calculatePointsForPosition(1, totalPlayersInDate);
                  tempRanking.totalPoints += winnerPoints;
                }
              }
            }
          });
        });

        // Aplicar ELIMINA N si aplica (>= threshold fechas anteriores)
        if (previousGameDates.length >= eliminationThreshold) {
          tempRankings.forEach((tempRanking, playerId) => {
            const ranking = playerRankings.get(playerId)!;
            const prevDateNumbers = previousGameDates.map(gd => gd.dateNumber);
            const prevScores = prevDateNumbers.map(dn => ranking.pointsByDate[dn] || 0);
            const sortedPrevScores = [...prevScores].sort((a, b) => a - b);

            const eliminatedPrevScores = sortedPrevScores.slice(0, datesToEliminate);
            const eliminatedPrevSum = eliminatedPrevScores.reduce((sum, s) => sum + s, 0);
            tempRanking.finalScore = tempRanking.totalPoints - eliminatedPrevSum;
          });
        } else {
          tempRankings.forEach(tempRanking => {
            tempRanking.finalScore = tempRanking.totalPoints;
          });
        }

        // Ordenar rankings temporales por puntuación
        const sortedTempRankings = Array.from(tempRankings.entries())
          .map(([playerId, data]) => ({
            playerId,
            score: data.finalScore ?? data.totalPoints
          }))
          .sort((a, b) => b.score - a.score);

        // Asignar posiciones anteriores
        sortedTempRankings.forEach((entry, index) => {
          previousRankings.set(entry.playerId, index + 1);
        });

        // Comparar posiciones actuales vs anteriores y asignar trend
        sortedRankings.forEach(ranking => {
          const previousPosition = previousRankings.get(ranking.playerId);

          if (previousPosition !== undefined) {
            const positionDiff = previousPosition - ranking.position; // Positivo = subió, negativo = bajó
            ranking.positionsChanged = positionDiff;

            if (positionDiff > 0) {
              ranking.trend = 'up';    // Mejoró (bajó número de posición)
            } else if (positionDiff < 0) {
              ranking.trend = 'down';  // Empeoró (subió número de posición)
            } else {
              ranking.trend = 'same';  // Mantuvo posición
            }
          } else {
            // Jugador nuevo o sin datos previos
            ranking.trend = 'same';
            ranking.positionsChanged = 0;
          }
        });
      } catch (error) {
        console.error('Error calculating trend:', error);
        // En caso de error, mantener todos como 'same'
        sortedRankings.forEach(r => {
          r.trend = 'same';
          r.positionsChanged = 0;
        });
      }
    } else {
      // Primera fecha: todos mantienen 'same'
      sortedRankings.forEach(r => {
        r.trend = 'same';
        r.positionsChanged = 0;
      });
    }

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        number: tournament.number,
        totalDates: tournament.totalDates ?? 12,
        datesToEliminate: tournament.datesToEliminate ?? 2,
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

// ============================================================================
// INSIGHTS DE TEMPORADA (rachas multi-fecha, récords) — bloque aditivo.
// No modifica calculateTournamentRanking; reutiliza el mismo criterio
// simplificado (orden solo por puntaje, sin desempates secundarios) que ya
// usa el cálculo de `trend` de arriba para estimar posiciones históricas.
// ============================================================================

const STREAK_WINDOW_DATES = 3;

interface InsightGameDate {
  dateNumber: number;
  status: string;
  playerIds: string[];
  eliminations: { eliminatedPlayerId: string; points: number; position: number }[];
}

/**
 * Puntaje acumulado (con ELIMINA N si aplica) de cada jugador usando solo
 * las primeras `count` fechas de `gameDates` (ordenadas por dateNumber asc).
 */
function scoresAtPrefix(
  gameDates: InsightGameDate[],
  count: number,
  registeredPlayerIds: string[],
  datesToEliminate: number,
  eliminationThreshold: number
): Map<string, number> {
  const prefix = gameDates.slice(0, count);
  const totals = new Map<string, number>();
  const pointsByDate = new Map<string, Map<number, number>>();
  registeredPlayerIds.forEach(id => {
    totals.set(id, 0);
    pointsByDate.set(id, new Map());
  });

  prefix.forEach(gameDate => {
    const totalPlayersInDate = gameDate.playerIds.length;
    gameDate.playerIds.forEach(playerId => {
      if (!totals.has(playerId)) return;
      const elimination = gameDate.eliminations.find(e => e.eliminatedPlayerId === playerId);
      let points = 0;
      if (elimination) {
        points = elimination.points;
      } else {
        const eliminatedCount = gameDate.eliminations.length;
        const activePlayersCount = totalPlayersInDate - eliminatedCount;
        if (activePlayersCount === 1) {
          const secondPlace = gameDate.eliminations.find(e => e.position === 2);
          points = secondPlace ? secondPlace.points + 3 : calculatePointsForPosition(1, totalPlayersInDate);
        }
      }
      totals.set(playerId, (totals.get(playerId) ?? 0) + points);
      pointsByDate.get(playerId)!.set(gameDate.dateNumber, points);
    });
  });

  const scores = new Map<string, number>();
  if (prefix.length >= eliminationThreshold) {
    registeredPlayerIds.forEach(id => {
      const dates = Array.from(pointsByDate.get(id)!.values());
      const sorted = [...dates].sort((a, b) => a - b);
      const eliminated = sorted.slice(0, datesToEliminate);
      const eliminatedSum = eliminated.reduce((sum, v) => sum + v, 0);
      scores.set(id, (totals.get(id) ?? 0) - eliminatedSum);
    });
  } else {
    registeredPlayerIds.forEach(id => scores.set(id, totals.get(id) ?? 0));
  }
  return scores;
}

function positionsFromScores(scores: Map<string, number>): Map<string, number> {
  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  const positions = new Map<string, number>();
  sorted.forEach(([playerId], index) => positions.set(playerId, index + 1));
  return positions;
}


/**
 * Calcula rachas de posición (últimas N fechas) y récords de temporada
 * (mayor salto en una fecha, racha actual de fechas seguidas en el Top 3).
 * Usado por la home nueva ("Los que vienen calientes" / "Los Malazos 7/2" /
 * "La temporada en números").
 */
export async function calculateTournamentInsights(tournamentId: number): Promise<TournamentInsightsData | null> {
  try {
    const currentRankingData = await calculateTournamentRanking(tournamentId);
    if (!currentRankingData || currentRankingData.tournament.completedDates < 2) {
      return null;
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        tournamentParticipants: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, role: true, photoUrl: true }
            }
          }
        },
        gameDates: {
          where: { status: { in: ['completed', 'in_progress'] } },
          include: {
            eliminations: {
              select: { eliminatedPlayerId: true, points: true, position: true }
            }
          },
          orderBy: { dateNumber: 'asc' }
        }
      }
    });
    if (!tournament) return null;

    const registeredPlayers = tournament.tournamentParticipants.map(tp => ({
      id: tp.player.id,
      name: `${tp.player.firstName} ${tp.player.lastName}`,
      photo: getPlayerPhotoUrl(tp.player.photoUrl, tp.player.role) || undefined
    }));
    const registeredPlayerIds = registeredPlayers.map(p => p.id);
    const playerById = new Map(registeredPlayers.map(p => [p.id, p]));

    const totalDates = tournament.totalDates ?? 12;
    const datesToEliminate = tournament.datesToEliminate ?? 2;
    const eliminationThreshold = Math.ceil(totalDates / 2);
    const gameDates: InsightGameDate[] = tournament.gameDates;
    const n = gameDates.length;

    // Posición actual "oficial" (con todos los criterios de desempate) desde calculateTournamentRanking
    const currentPositionById = new Map(currentRankingData.rankings.map(r => [r.playerId, r.position]));
    const currentPointsById = new Map(currentRankingData.rankings.map(r => [r.playerId, r.finalScore ?? r.totalPoints]));

    // Posiciones en cada prefijo de fechas (criterio simplificado, con caché)
    const positionsAtPrefixCache = new Map<number, Map<string, number>>();
    const positionsAtPrefix = (count: number): Map<string, number> => {
      if (count <= 0) return new Map();
      const cached = positionsAtPrefixCache.get(count);
      if (cached) return cached;
      const scores = scoresAtPrefix(gameDates, count, registeredPlayerIds, datesToEliminate, eliminationThreshold);
      const positions = positionsFromScores(scores);
      positionsAtPrefixCache.set(count, positions);
      return positions;
    };

    // --- Rachas (ventana de STREAK_WINDOW_DATES fechas) ---
    const windowStart = Math.max(0, n - STREAK_WINDOW_DATES);
    const positionsBeforeWindow = positionsAtPrefix(windowStart);
    const deltas: PlayerPositionDelta[] = registeredPlayerIds
      .map((playerId): PlayerPositionDelta | null => {
        const before = positionsBeforeWindow.get(playerId);
        const now = currentPositionById.get(playerId);
        if (before === undefined || now === undefined) return null;
        const player = playerById.get(playerId)!;
        return {
          playerId,
          playerName: player.name,
          playerPhoto: player.photo,
          positionsChanged: before - now,
          points: currentPointsById.get(playerId) ?? 0
        };
      })
      .filter((d): d is PlayerPositionDelta => d !== null && d.positionsChanged !== 0);

    const hot = [...deltas].sort((a, b) => b.positionsChanged - a.positionsChanged).slice(0, 3);

    // --- Mayor salto de la temporada (una sola fecha) ---
    let biggestJump: TournamentInsightsData['seasonHighlights']['biggestJump'] = null;
    for (let k = 2; k <= n; k++) {
      const before = positionsAtPrefix(k - 1);
      const after = positionsAtPrefix(k);
      registeredPlayerIds.forEach(playerId => {
        const b = before.get(playerId);
        const a = after.get(playerId);
        if (b === undefined || a === undefined) return;
        const change = b - a;
        if (!biggestJump || change > biggestJump.positionsChanged) {
          const player = playerById.get(playerId)!;
          biggestJump = {
            playerId,
            playerName: player.name,
            playerPhoto: player.photo,
            positionsChanged: change,
            points: currentPointsById.get(playerId) ?? 0,
            dateNumber: gameDates[k - 1].dateNumber
          };
        }
      });
    }

    // --- Racha actual de fechas seguidas en el Top 3 ---
    let longestTop3Streak: TournamentInsightsData['seasonHighlights']['longestTop3Streak'] = null;
    registeredPlayerIds.forEach(playerId => {
      let streak = 0;
      for (let k = n; k >= 1; k--) {
        const pos = positionsAtPrefix(k).get(playerId);
        if (pos !== undefined && pos <= 3) {
          streak++;
        } else {
          break;
        }
      }
      if (streak >= 2 && (!longestTop3Streak || streak > longestTop3Streak.streakLength)) {
        const player = playerById.get(playerId)!;
        longestTop3Streak = { playerId, playerName: player.name, playerPhoto: player.photo, streakLength: streak };
      }
    });

    return {
      streaks: { hot },
      seasonHighlights: { biggestJump, longestTop3Streak }
    };
  } catch (error) {
    console.error('Error calculating tournament insights:', error);
    return null;
  }
}
