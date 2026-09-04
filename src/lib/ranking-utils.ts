import { prisma } from './prisma';
import { calculatePointsForPosition } from './tournament-utils';
import { getPlayerPhotoUrl } from './player-utils';
import { getPointPenaltiesByPlayer } from './player-adjustments';

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
  positionsChanged: number; // Número de posiciones que cambió (positivo = subió, negativo = bajó)
  // Sistema ELIMINA N: peores fechas y puntuación final
  elimina1?: number; // Peor fecha (menor puntuación)
  elimina2?: number; // Segunda peor fecha
  elimina3?: number; // Tercera peor fecha (si datesToEliminate >= 3)
  eliminasActive: boolean; // true = se aplican al ranking (umbral alcanzado), false = solo informativo
  finalScore?: number; // Puntuación final (total - N peores fechas - multas de puntos)
  pointPenalty?: number; // Multas de puntos ya descontadas del finalScore
  // Estadísticas para criterios de desempate
  firstPlaces: number;  // Cantidad de fechas ganadas (1er lugar)
  secondPlaces: number; // Cantidad de segundos lugares
  thirdPlaces: number;  // Cantidad de terceros lugares
  lastPlaces: number;   // Cantidad de últimos lugares (primer eliminado / 7-2)
  absences: number;     // Cantidad de ausencias (0 puntos)
}

export interface TournamentRankingData {
  tournament: {
    id: number;
    name: string;
    number: number;
    totalDates: number;
    datesToEliminate: number;
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

    // Calcular puntos por jugador por fecha
    const playerRankings = new Map<string, PlayerRanking>();

    // Inicializar rankings para todos los jugadores registrados
    registeredPlayers.forEach(player => {
      playerRankings.set(player.id, {
        position: 0, // Se calculará después
        playerId: player.id,
        playerName: player.name,
        playerAlias: player.alias,
        playerPhoto: player.photo ?? undefined,
        totalPoints: 0,
        datesPlayed: 0,
        pointsByDate: {},
        trend: 'same',
        positionsChanged: 0,
        eliminasActive: false,
        pointPenalty: pointPenalties.get(player.id) ?? 0,
        // Inicializar estadísticas de desempate
        firstPlaces: 0,
        secondPlaces: 0,
        thirdPlaces: 0,
        lastPlaces: 0,
        absences: 0
      });
    });

    // Procesar cada fecha completada
    tournament.gameDates.forEach(gameDate => {
      const totalPlayersInDate = gameDate.playerIds.length;

      // Calcular posiciones para esta fecha (necesario para estadísticas de desempate)
      const datePositions = new Map<string, number>();

      // Encontrar la posición más alta (primer eliminado = último lugar = 7/2)
      const maxPosition = gameDate.eliminations.length > 0
        ? Math.max(...gameDate.eliminations.map(e => e.position))
        : totalPlayersInDate;

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

            // Registrar posición para estadísticas de desempate
            datePositions.set(playerId, elimination.position);

            // Actualizar estadísticas de desempate
            if (elimination.position === 1) ranking.firstPlaces++;  // Contar victorias
            if (elimination.position === 2) ranking.secondPlaces++;
            if (elimination.position === 3) ranking.thirdPlaces++;
            if (elimination.position === maxPosition) ranking.lastPlaces++;  // Primer eliminado (7-2)
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
              
              // Registrar como ganador (posición 1)
              datePositions.set(playerId, 1);
              ranking.firstPlaces++;
            } else {
              // Aún jugando, no tiene puntos todavía
              ranking.pointsByDate[gameDate.dateNumber] = 0;
              // No sumar a totalPoints (permanece sin cambios)
            }
          }
        }
      });

      // Para jugadores registrados que NO participaron en esta fecha: 0 puntos (ausencia)
      registeredPlayers.forEach(player => {
        if (!gameDate.playerIds.includes(player.id)) {
          const ranking = playerRankings.get(player.id)!;
          ranking.pointsByDate[gameDate.dateNumber] = 0;
          ranking.absences++; // Contar como ausencia para desempate
          // totalPoints no cambia (no suma ni resta)
        }
      });
    });

    // SISTEMA ELIMINA N: Calcular puntuación final eliminando las N peores fechas
    // Configuración dinámica: totalDates (10-15) y datesToEliminate (2-3)
    const totalDates = tournament.totalDates ?? 12;
    const datesToEliminate = tournament.datesToEliminate ?? 2;
    const eliminationThreshold = Math.ceil(totalDates / 2); // Aplicar a partir de la mitad de fechas

    Array.from(playerRankings.values()).forEach(ranking => {
      const dateNumbers = Object.keys(ranking.pointsByDate).map(Number).sort((a, b) => a - b);
      const completedDatesCount = dateNumbers.length;

      // Siempre calcular las N peores fechas para mostrar en tabla
      if (completedDatesCount > 0) {
        const allScores = dateNumbers.map(dateNumber => ranking.pointsByDate[dateNumber]);
        const sortedScores = [...allScores].sort((a, b) => a - b);
        const eliminatedScores = sortedScores.slice(0, datesToEliminate);
        ranking.elimina1 = eliminatedScores[0];
        ranking.elimina2 = eliminatedScores[1];
        ranking.elimina3 = eliminatedScores[2];
      }

      // Aplicar al ranking (finalScore) solo a partir del threshold
      if (completedDatesCount >= eliminationThreshold) {
        ranking.eliminasActive = true;
        const allScores = dateNumbers.map(dateNumber => ranking.pointsByDate[dateNumber]);
        const sortedScores = [...allScores].sort((a, b) => a - b);
        const eliminatedScores = sortedScores.slice(0, datesToEliminate);
        const eliminatedSum = eliminatedScores.reduce((sum, s) => sum + s, 0);
        ranking.finalScore = ranking.totalPoints - eliminatedSum - (ranking.pointPenalty ?? 0);
      } else {
        // Antes del threshold: puntaje final = total (eliminas solo informativas), menos multas de puntos
        ranking.eliminasActive = false;
        ranking.finalScore = ranking.totalPoints - (ranking.pointPenalty ?? 0);
      }
    });

    /**
     * Función de comparación con criterios de desempate
     * Criterios en orden de prioridad:
     * 1. Puntos totales (mayor)
     * 2. Más primeros lugares (victorias)
     * 3. Más segundos lugares
     * 4. Más terceros lugares
     * 5. Menos ausencias (mejor asistencia)
     */
    const compareRankings = (a: PlayerRanking, b: PlayerRanking): number => {
      const aScore = a.finalScore ?? a.totalPoints;
      const bScore = b.finalScore ?? b.totalPoints;

      // 1. Puntuación final (mayor gana)
      if (aScore !== bScore) {
        return bScore - aScore;
      }

      // 2. Puntos totales como desempate secundario (para contexto histórico)
      if (a.totalPoints !== b.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }

      // 3. Más primeros lugares (victorias)
      if (a.firstPlaces !== b.firstPlaces) {
        return b.firstPlaces - a.firstPlaces;
      }

      // 4. Más segundos lugares
      if (a.secondPlaces !== b.secondPlaces) {
        return b.secondPlaces - a.secondPlaces;
      }

      // 5. Más terceros lugares
      if (a.thirdPlaces !== b.thirdPlaces) {
        return b.thirdPlaces - a.thirdPlaces;
      }

      // 6. Menos ausencias (mejor asistencia)
      if (a.absences !== b.absences) {
        return a.absences - b.absences; // Menor es mejor
      }
      
      // Si todos los criterios son iguales, mantener orden alfabético por nombre
      return a.playerName.localeCompare(b.playerName);
    };

    // Ordenar con criterios de desempate y asignar posiciones
    const sortedRankings = Array.from(playerRankings.values())
      .sort(compareRankings);

    // Asignar posiciones (manejar empates verdaderos - muy raros después de los criterios)
    let currentPosition = 1;
    sortedRankings.forEach((ranking, index) => {
      if (index > 0) {
        const previous = sortedRankings[index - 1];
        // Solo cambiar posición si son realmente diferentes según todos los criterios
        if (compareRankings(previous, ranking) !== 0) {
          currentPosition = index + 1;
        }
      }
      ranking.position = currentPosition;
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

                if (activePlayersCount === 1 || gameDate.status === 'completed') {
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
        if (activePlayersCount === 1 || gameDate.status === 'completed') {
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

export interface PlayerPositionDelta {
  playerId: string;
  playerName: string;
  playerPhoto?: string;
  positionsChanged: number;
  points: number;
}

export interface TournamentInsightsData {
  streaks: {
    hot: PlayerPositionDelta[];
    cold: PlayerPositionDelta[];
  };
  seasonHighlights: {
    biggestJump: (PlayerPositionDelta & { dateNumber: number }) | null;
    longestTop3Streak: { playerId: string; playerName: string; playerPhoto?: string; streakLength: number } | null;
  };
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
    const cold = [...deltas].sort((a, b) => a.positionsChanged - b.positionsChanged).slice(0, 2);

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
      streaks: { hot, cold },
      seasonHighlights: { biggestJump, longestTop3Streak }
    };
  } catch (error) {
    console.error('Error calculating tournament insights:', error);
    return null;
  }
}

/**
 * Fechas (números) en las que al menos un jugador registró puntos.
 * Usado para calcular métricas de "forma reciente" en el cliente,
 * a partir de PlayerRanking[] ya cargado (sin llamadas adicionales).
 */
export function playedDateNumbers(rankings: PlayerRanking[]): number[] {
  const set = new Set<number>();
  rankings.forEach(r => Object.keys(r.pointsByDate).forEach(d => set.add(Number(d))));
  return Array.from(set).sort((a, b) => a - b);
}

/** Puesto del jugador esa noche puntual (según puntos de esa fecha), o null si no jugó. */
export function nightlyPosition(rankings: PlayerRanking[], dateNumber: number, playerId: string): number | null {
  const entries = rankings
    .map(r => ({ playerId: r.playerId, points: r.pointsByDate[dateNumber] }))
    .filter((e): e is { playerId: string; points: number } => typeof e.points === 'number' && e.points > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b.points - a.points);
  const idx = entries.findIndex(e => e.playerId === playerId);
  return idx === -1 ? null : idx + 1;
}

/** Promedio del puesto nocturno del jugador en las fechas que jugó (excluye ausencias). */
export function averageNightlyPosition(rankings: PlayerRanking[], playerId: string): number | null {
  const player = rankings.find(r => r.playerId === playerId);
  if (!player) return null;
  const myPlayedDates = playedDateNumbers(rankings).filter(d => (player.pointsByDate[d] ?? 0) > 0);
  if (myPlayedDates.length === 0) return null;
  const sum = myPlayedDates.reduce((acc, d) => acc + (nightlyPosition(rankings, d, playerId) ?? 0), 0);
  return sum / myPlayedDates.length;
}

/** Promedio de puntos por fecha, sin contar las fechas eliminadas por el sistema ELIMINA N. */
export function averagePointsPerDate(player: PlayerRanking): number {
  const eliminatedDatesCount = player.eliminasActive ? (player.elimina3 !== undefined ? 3 : 2) : 0;
  const countedDates = Math.max(1, player.datesPlayed - eliminatedDatesCount);
  return (player.finalScore ?? player.totalPoints) / countedDates;
}
