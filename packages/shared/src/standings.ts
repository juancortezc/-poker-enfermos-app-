/**
 * La tabla del torneo, sin base de datos. Es el nucleo de
 * calculateTournamentRanking (apps/web/src/lib/ranking-utils.ts): esa funcion
 * carga los datos, llama a esta y le agrega la proyeccion en vivo y la
 * tendencia. El reporte de Excel la usa tambien para rehacer la tabla despues
 * de cada fecha (la evolucion), asi que las dos miran la misma regla.
 */
import { calculatePointsForPosition } from './points';
import { compareByTiebreak, type PlayerRanking } from './ranking';

export interface StandingsPlayer {
  id: string;
  name: string;
  alias?: string;
  photo?: string;
}

export interface StandingsElimination {
  eliminatedPlayerId: string;
  position: number;
  points: number;
}

export interface StandingsGameDate {
  dateNumber: number;
  playerIds: string[];
  eliminations: StandingsElimination[];
}

export interface StandingsOptions {
  totalDates?: number | null;
  datesToEliminate?: number | null;
  /** Multas de puntos por jugador, ya sumadas. */
  pointPenalties?: ReadonlyMap<string, number>;
}

/** Quien sigue sentado en una fecha en curso: todavia no tiene resultado. */
export interface StillPlaying {
  playerId: string;
  dateNumber: number;
  totalPlayersInDate: number;
  eliminatedCount: number;
}

export interface StandingsResult {
  rankings: PlayerRanking[];
  stillPlaying: StillPlaying[];
  datesToEliminate: number;
  eliminationThreshold: number;
}

/** El ELIMINA empieza a descontar a partir de la mitad de las fechas. */
export function eliminationThresholdFor(totalDates: number): number {
  return Math.ceil(totalDates / 2);
}

/**
 * Puntos del ganador cuando no quedo guardado como eliminacion en la posicion 1
 * (fechas viejas): los del segundo mas 3, o la tabla si no hay segundo.
 */
export function winnerPointsFor(date: StandingsGameDate): number {
  const second = date.eliminations.find(e => e.position === 2);
  return second ? second.points + 3 : calculatePointsForPosition(1, date.playerIds.length);
}

/**
 * Ordena la tabla con los criterios oficiales (compareByTiebreak) y reparte
 * posiciones. Dos jugadores comparten puesto solo si empatan en todo.
 */
export function assignPositions(rankings: PlayerRanking[]): PlayerRanking[] {
  const sorted = [...rankings].sort(compareByTiebreak);
  let current = 1;
  sorted.forEach((r, i) => {
    if (i > 0 && compareByTiebreak(sorted[i - 1], r) !== 0) current = i + 1;
    r.position = current;
  });
  return sorted;
}

/**
 * Tabla del torneo con las fechas dadas (en orden). Las fechas en curso pueden
 * venir: quien ya salio suma sus puntos y quien sigue en la mesa no suma nada y
 * queda en `stillPlaying`.
 *
 * - Ausencia: 0 puntos en esa fecha (cuenta para el ELIMINA) y una falta.
 * - Ultimo lugar (el 2 de la noche) = la posicion mas alta registrada; el
 *   penultimo (el 7) = la siguiente.
 * - ELIMINA N: con la mitad de las fechas jugadas se descuentan las N peores.
 * - Multas de puntos: se restan del puntaje final.
 */
export function computeStandings(
  players: StandingsPlayer[],
  gameDates: StandingsGameDate[],
  options: StandingsOptions = {}
): StandingsResult {
  const totalDates = options.totalDates ?? 12;
  const datesToEliminate = options.datesToEliminate ?? 2;
  const threshold = eliminationThresholdFor(totalDates);
  const penalties = options.pointPenalties ?? new Map<string, number>();

  const byId = new Map<string, PlayerRanking>();
  players.forEach(p => {
    byId.set(p.id, {
      position: 0,
      playerId: p.id,
      playerName: p.name,
      playerAlias: p.alias,
      playerPhoto: p.photo,
      totalPoints: 0,
      datesPlayed: 0,
      pointsByDate: {},
      trend: 'same',
      positionsChanged: 0,
      eliminasActive: false,
      pointPenalty: penalties.get(p.id) ?? 0,
      firstPlaces: 0,
      secondPlaces: 0,
      thirdPlaces: 0,
      lastPlaces: 0,
      secondToLastPlaces: 0,
      absences: 0,
    });
  });

  const stillPlaying: StillPlaying[] = [];

  gameDates.forEach(date => {
    const totalPlayersInDate = date.playerIds.length;
    const maxPosition = date.eliminations.length > 0
      ? Math.max(...date.eliminations.map(e => e.position))
      : totalPlayersInDate;
    const present = new Set(date.playerIds);

    date.playerIds.forEach(playerId => {
      const r = byId.get(playerId);
      if (!r) return;
      r.datesPlayed += 1;

      const elimination = date.eliminations.find(e => e.eliminatedPlayerId === playerId);
      if (elimination) {
        r.pointsByDate[date.dateNumber] = elimination.points;
        r.totalPoints += elimination.points;
        if (elimination.position === 1) r.firstPlaces++;
        if (elimination.position === 2) r.secondPlaces++;
        if (elimination.position === 3) r.thirdPlaces++;
        if (elimination.position === maxPosition) r.lastPlaces++;
        if (elimination.position === maxPosition - 1) r.secondToLastPlaces++;
        return;
      }

      const eliminatedCount = date.eliminations.length;
      // Se exige que quede UNO solo sin eliminacion: si por un import parcial
      // quedaran dos sin fila, ninguno se lleva la victoria.
      if (totalPlayersInDate - eliminatedCount === 1) {
        const points = winnerPointsFor(date);
        r.pointsByDate[date.dateNumber] = points;
        r.totalPoints += points;
        r.firstPlaces++;
      } else {
        // Sigue en la mesa: no hay resultado, no se escribe nada.
        stillPlaying.push({ playerId, dateNumber: date.dateNumber, totalPlayersInDate, eliminatedCount });
      }
    });

    byId.forEach(r => {
      if (!present.has(r.playerId)) {
        r.pointsByDate[date.dateNumber] = 0;
        r.absences++;
      }
    });
  });

  byId.forEach(r => {
    const scores = Object.keys(r.pointsByDate).map(Number).sort((a, b) => a - b).map(d => r.pointsByDate[d]);
    const worst = [...scores].sort((a, b) => a - b).slice(0, datesToEliminate);
    if (scores.length > 0) {
      r.elimina1 = worst[0];
      r.elimina2 = worst[1];
      r.elimina3 = worst[2];
    }
    if (scores.length >= threshold) {
      r.eliminasActive = true;
      r.finalScore = r.totalPoints - worst.reduce((s, v) => s + v, 0) - (r.pointPenalty ?? 0);
    } else {
      r.eliminasActive = false;
      r.finalScore = r.totalPoints - (r.pointPenalty ?? 0);
    }
  });

  return {
    rankings: assignPositions(Array.from(byId.values())),
    stillPlaying,
    datesToEliminate,
    eliminationThreshold: threshold,
  };
}
