import { prisma } from './prisma';
import { calculatePointsForPosition } from './tournament-utils';
import { getPlayerPhotoUrl } from './player-utils';

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
  // Sistema ELIMINA 2: peores fechas y puntuación final
  elimina1?: number; // Peor fecha (menor puntuación)
  elimina2?: number; // Segunda peor fecha
  finalScore?: number; // Puntuación final (mejores 10 fechas)
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

    // SISTEMA ELIMINA 2: Calcular puntuación final usando las 10 mejores fechas de 12
    // Regla: De las 12 fechas del torneo, solo las 10 mejores cuentan para el campeonato
    // Se eliminan las 2 fechas con peores resultados (incluyendo ausencias = 0 puntos)
    Array.from(playerRankings.values()).forEach(ranking => {
      const dateNumbers = Object.keys(ranking.pointsByDate).map(Number).sort((a, b) => a - b);
      const completedDatesCount = dateNumbers.length;
      
      // Solo aplicar eliminaciones a partir de 6 fechas jugadas (permite mostrar desde fecha 6)
      if (completedDatesCount >= 6) {
        // Obtener todas las puntuaciones (incluyendo 0 para fechas ausentes)
        const allScores = dateNumbers.map(dateNumber => ranking.pointsByDate[dateNumber]);
        
        // Ordenar puntuaciones de menor a mayor para identificar las peores
        const sortedScores = [...allScores].sort((a, b) => a - b);
        
        // Identificar las 2 peores fechas para eliminación
        ranking.elimina1 = sortedScores[0]; // Peor puntuación (incluye 0 por ausencias)
        ranking.elimina2 = sortedScores[1]; // Segunda peor puntuación
        
        // PUNTUACIÓN FINAL = Total - 2 peores fechas (equivale a sumar solo las mejores)
        // Ejemplo: Total 100 pts, elimina 5+8 = Final 87 pts (suma de mejores fechas)
        ranking.finalScore = ranking.totalPoints - (ranking.elimina1 + ranking.elimina2);
      } else {
        // Antes de la fecha 6: usar puntuación total sin eliminaciones
        ranking.elimina1 = undefined;
        ranking.elimina2 = undefined;
        ranking.finalScore = ranking.totalPoints;
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

        // Aplicar ELIMINA 2 si aplica (>= 6 fechas anteriores)
        if (previousGameDates.length >= 6) {
          tempRankings.forEach((tempRanking, playerId) => {
            const ranking = playerRankings.get(playerId)!;
            const prevDateNumbers = previousGameDates.map(gd => gd.dateNumber);
            const prevScores = prevDateNumbers.map(dn => ranking.pointsByDate[dn] || 0);
            const sortedPrevScores = [...prevScores].sort((a, b) => a - b);

            const elimina1 = sortedPrevScores[0];
            const elimina2 = sortedPrevScores[1];
            tempRanking.finalScore = tempRanking.totalPoints - (elimina1 + elimina2);
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
