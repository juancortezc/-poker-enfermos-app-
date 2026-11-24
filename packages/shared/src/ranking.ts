/**
 * Tipos y reglas puras del ranking ELIMINA (sin base de datos).
 *
 * El calculo que consulta la base vive en apps/web/src/lib/ranking-utils.ts;
 * aqui queda lo que el cliente (web y movil) necesita para mostrar y ordenar
 * un ranking ya cargado.
 */

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
  secondToLastPlaces: number; // Cantidad de penúltimos lugares (segundo eliminado)
  absences: number;     // Cantidad de ausencias (0 puntos)
  /**
   * Solo mientras hay una fecha en curso y este jugador sigue en la mesa.
   *
   * NO forma parte de la tabla real: totalPoints, finalScore y los elimina de
   * arriba se calculan como si la fecha de hoy no existiera, porque todavia no
   * existe. Esto es lo que se veria SI saliera ahora mismo, para poder mirar la
   * tabla durante la fecha y entender donde quedaria uno.
   *
   * Antes aqui se escribia un 0 en pointsByDate, indistinguible de un resultado
   * real: se pintaba como celda, contaba como fecha jugada (adelantando el
   * umbral del ELIMINA una fecha) y se descartaba como la peor de todas.
   */
  liveProjection?: {
    dateNumber: number;
    /** Posicion que le toca al proximo eliminado. */
    position: number;
    /** Puntos que se lleva esa posicion. */
    points: number;
    /** Puntaje final si sale ahora, ya con el ELIMINA aplicado. */
    finalScore: number;
    /** Las N peores fechas contando la de hoy. */
    elimina1?: number;
    elimina2?: number;
    elimina3?: number;
    /** true = con la fecha de hoy el ELIMINA ya afecta al puntaje. */
    eliminasActive: boolean;
  };
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
  };
  seasonHighlights: {
    biggestJump: (PlayerPositionDelta & { dateNumber: number }) | null;
    longestTop3Streak: { playerId: string; playerName: string; playerPhoto?: string; streakLength: number } | null;
  };
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

/**
 * Promedio de puntos en las fechas que el jugador realmente jugó.
 *
 * Es rendimiento por noche, no puntaje de torneo: NO se aplica el ELIMINA ni
 * se descuentan multas. Así queda comparable con la posición promedio, que
 * también se calcula solo sobre las fechas jugadas.
 *
 * Se filtra por puntos > 0 porque una ausencia queda registrada como 0 en
 * pointsByDate, mientras que una fecha jugada siempre da al menos 1 punto
 * (el último puesto). Eso también deja fuera la fecha en curso para quien
 * todavía está en mesa, que aún no tiene puntos.
 */
export function averagePointsPerDate(player: PlayerRanking): number {
  const scores = Object.values(player.pointsByDate).filter(points => points > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, points) => sum + points, 0) / scores.length;
}

/**
 * Vocabulario de puntaje. Un solo par de nombres en toda la app.
 *
 * PUNTOS   → finalScore. Es el que ordena la tabla y el único que decide el
 *            campeonato. Siempre va destacado.
 * ACUM.    → totalPoints. Suma cruda de todas las fechas, sin descartar nada.
 *            Es informativo: siempre va discreto y nunca compite con PUNTOS.
 *
 * No escribir estas etiquetas a mano en los componentes.
 */
/**
 * Criterios de desempate del torneo, en orden.
 *
 *   1. Puntaje final (el que manda, ya con el ELIMINA y las multas)
 *   2. Mas victorias
 *   3. Mas segundos
 *   4. Mas terceros
 *   5. MENOS ultimos lugares (el 7/2)
 *   6. MENOS penultimos
 *   7. Mas puntos totales
 *   8. Orden alfabetico, para que nunca quede indefinido
 *
 * Antes los puntos totales se evaluaban en segundo lugar, asi que un empate
 * lo ganaba quien mas habia acumulado y los podios no llegaban a mirarse.
 * Ahora el podio pesa mas que el volumen: primero como te fue, despues cuanto
 * sumaste. El acumulado queda como ultimo recurso.
 *
 * Es la unica fuente de la verdad: la tabla oficial, la proyeccion en vivo,
 * la vista ACUM. y las imagenes para compartir usan esta funcion.
 */
export function compareByTiebreak(
  a: Pick<PlayerRanking, 'finalScore' | 'totalPoints' | 'firstPlaces' | 'secondPlaces' | 'thirdPlaces' | 'lastPlaces' | 'secondToLastPlaces' | 'playerName'>,
  b: typeof a
): number {
  const aScore = a.finalScore ?? a.totalPoints;
  const bScore = b.finalScore ?? b.totalPoints;
  if (aScore !== bScore) return bScore - aScore;

  if (a.firstPlaces !== b.firstPlaces) return b.firstPlaces - a.firstPlaces;
  if (a.secondPlaces !== b.secondPlaces) return b.secondPlaces - a.secondPlaces;
  if (a.thirdPlaces !== b.thirdPlaces) return b.thirdPlaces - a.thirdPlaces;

  // Menos es mejor: son las noches malas.
  if (a.lastPlaces !== b.lastPlaces) return a.lastPlaces - b.lastPlaces;
  if (a.secondToLastPlaces !== b.secondToLastPlaces) return a.secondToLastPlaces - b.secondToLastPlaces;

  if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;

  return a.playerName.localeCompare(b.playerName);
}

export const SCORE_LABELS = {
  points: 'PUNTOS',
  pointsShort: 'PTS',
  accumulated: 'ACUM.',
  accumulatedLong: 'Acumulado'
} as const;

/**
 * El puntaje que manda: el que ordena la tabla del torneo.
 * finalScore ya trae descontadas las fechas del ELIMINA y las multas de puntos.
 */
export function scoreOf(player: Pick<PlayerRanking, 'finalScore' | 'totalPoints'>): number {
  return player.finalScore ?? player.totalPoints;
}

/**
 * Fechas que el jugador descarta por el sistema ELIMINA, con el mismo criterio
 * que calculateTournamentRanking: puntos ascendente y orden estable, así que en
 * empate se descarta la fecha más antigua.
 */
export function eliminatedDateNumbers(player: PlayerRanking, datesToEliminate: number): Set<number> {
  if (!player.eliminasActive || datesToEliminate <= 0) return new Set();
  const dateNumbers = Object.keys(player.pointsByDate).map(Number).sort((a, b) => a - b);
  const worstFirst = [...dateNumbers].sort(
    (a, b) => (player.pointsByDate[a] ?? 0) - (player.pointsByDate[b] ?? 0)
  );
  return new Set(worstFirst.slice(0, datesToEliminate));
}
