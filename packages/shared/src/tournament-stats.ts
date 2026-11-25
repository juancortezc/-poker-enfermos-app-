/**
 * Estadisticas de un torneo para el reporte de fin de torneo (Excel) y las
 * pantallas de Reportes, sin base de datos.
 *
 * QUE ES EL 7/2
 *
 * La peor mano del poker. El **2 es el ULTIMO** y el **7 el PENULTIMO**:
 * - De la noche: los dos primeros eliminados de la fecha. El 2 es el primero
 *   en salir (la posicion mas alta, tambien llamado "el malazo") y el 7 el
 *   segundo en salir.
 * - Del torneo: los dos ultimos de la tabla final, con el orden oficial
 *   (compareByTiebreak). El 2 es el ultimo y el 7 el penultimo.
 *
 * Todo lo que la web, la app y el Excel muestran sobre el 7/2 sale de
 * nightSieteDos / tournamentSieteDos.
 */
import type { PlayerRanking } from './ranking';
import { eliminatedDateNumbers, scoreOf } from './ranking';
import { computeStandings, winnerPointsFor } from './standings';

// ---------------------------------------------------------------------------
// 7/2
// ---------------------------------------------------------------------------

/** Los dos primeros eliminados de una noche: [el 2 (primero en salir), el 7]. */
export function nightSieteDos<E extends { position: number }>(eliminations: readonly E[]): { dos: E | null; siete: E | null } {
  if (eliminations.length === 0) return { dos: null, siete: null };
  const max = Math.max(...eliminations.map(e => e.position));
  const dos = eliminations.find(e => e.position === max) ?? null;
  // Con una sola eliminacion (la del ganador) no hay 7.
  const siete = max > 2 ? eliminations.find(e => e.position === max - 1) ?? null : null;
  return { dos, siete: siete && siete !== dos ? siete : null };
}

/** Minimo de jugadores en la tabla para que el 7/2 no se pise con el podio. */
export const MIN_PLAYERS_FOR_TOURNAMENT_SIETE_DOS = 5;

/**
 * El 7/2 del torneo: los dos ultimos de la tabla. `siete` es el penultimo y
 * `dos` el ultimo. Null si la tabla es demasiado corta.
 */
export function tournamentSieteDos<R extends Pick<PlayerRanking, 'position'>>(rankings: readonly R[]): { siete: R; dos: R } | null {
  if (rankings.length < MIN_PLAYERS_FOR_TOURNAMENT_SIETE_DOS) return null;
  const sorted = [...rankings].sort((a, b) => a.position - b.position);
  return { siete: sorted[sorted.length - 2], dos: sorted[sorted.length - 1] };
}

// ---------------------------------------------------------------------------
// Entrada comun
// ---------------------------------------------------------------------------

export interface TSPlayer {
  id: string;
  name: string;
  role?: string;
}

export interface TSElimination {
  eliminatedPlayerId: string;
  eliminatorPlayerId: string;
  position: number;
  points: number;
}

export interface TSGameDate {
  dateNumber: number;
  /** "YYYY-MM-DD". */
  scheduledDate: string;
  playerIds: string[];
  eliminations: TSElimination[];
}

export interface TSInput {
  tournament: {
    number: number;
    name: string;
    status?: string;
    totalDates?: number | null;
    datesToEliminate?: number | null;
  };
  /** Todos los jugadores que aparecen (inscritos e invitados). */
  players: TSPlayer[];
  /** Inscritos en el torneo: son los que entran en la tabla. */
  registeredIds: string[];
  /** Solo fechas cerradas. Se ordenan por numero aqui. */
  gameDates: TSGameDate[];
  pointPenalties?: ReadonlyMap<string, number>;
}

// ---------------------------------------------------------------------------
// Cada noche
// ---------------------------------------------------------------------------

export interface NightResult {
  dateNumber: number;
  scheduledDate: string;
  players: number;
  registeredPresent: number;
  guests: number;
  /** Inscritos que no fueron. */
  absentIds: string[];
  /** Puesto de cada jugador esa noche (1 = ganador). */
  positions: Map<string, number>;
  points: Map<string, number>;
  /** Quien saco a cada uno (sin el ganador). */
  eliminatorOf: Map<string, string>;
  winnerId: string | null;
  secondId: string | null;
  thirdId: string | null;
  /** El 2 de la noche: el primero en salir (el malazo). */
  dosId: string | null;
  dosEliminatorId: string | null;
  /** El 7 de la noche: el segundo en salir. */
  sieteId: string | null;
  /** Eliminaciones hechas esa noche (sin contar la fila del ganador). */
  eliminationsBy: Map<string, number>;
  varonIds: string[];
  varonCount: number;
}

export function nightResult(date: TSGameDate, registered: ReadonlySet<string>): NightResult {
  const positions = new Map<string, number>();
  const points = new Map<string, number>();
  const eliminatorOf = new Map<string, string>();
  date.eliminations.forEach(e => {
    positions.set(e.eliminatedPlayerId, e.position);
    points.set(e.eliminatedPlayerId, e.points);
    if (e.position !== 1) eliminatorOf.set(e.eliminatedPlayerId, e.eliminatorPlayerId);
  });
  const remaining = date.playerIds.filter(id => !positions.has(id));
  if (!date.eliminations.some(e => e.position === 1) && remaining.length === 1) {
    positions.set(remaining[0], 1);
    points.set(remaining[0], winnerPointsFor(date));
  }
  const at = (p: number) => {
    for (const [id, pos] of positions) if (pos === p) return id;
    return null;
  };

  const eliminationsBy = new Map<string, number>();
  date.eliminations
    .filter(e => e.position !== 1)
    .forEach(e => eliminationsBy.set(e.eliminatorPlayerId, (eliminationsBy.get(e.eliminatorPlayerId) ?? 0) + 1));
  const varonCount = Math.max(0, ...eliminationsBy.values());
  const varonIds = varonCount > 0 ? [...eliminationsBy].filter(([, c]) => c === varonCount).map(([id]) => id) : [];

  const { dos, siete } = nightSieteDos(date.eliminations);
  const present = new Set(date.playerIds);
  const registeredPresent = date.playerIds.filter(id => registered.has(id)).length;

  return {
    dateNumber: date.dateNumber,
    scheduledDate: date.scheduledDate,
    players: date.playerIds.length,
    registeredPresent,
    guests: date.playerIds.length - registeredPresent,
    absentIds: [...registered].filter(id => !present.has(id)),
    positions,
    points,
    eliminatorOf,
    winnerId: at(1),
    secondId: at(2),
    thirdId: at(3),
    dosId: dos?.eliminatedPlayerId ?? null,
    dosEliminatorId: dos?.eliminatorPlayerId ?? null,
    sieteId: siete?.eliminatedPlayerId ?? null,
    eliminationsBy,
    varonIds,
    varonCount,
  };
}

// ---------------------------------------------------------------------------
// Premios del torneo (las 8 categorias de /api/stats/awards)
// ---------------------------------------------------------------------------

export interface AwardCount {
  playerId: string;
  count: number;
}

export interface SieteDosCount extends AwardCount {
  /** Veces 7 de la noche (segundo en salir). */
  sieteCount: number;
  /** Veces 2 de la noche (primero en salir). */
  dosCount: number;
}

export interface TournamentAwardsData {
  /** Mas eliminaciones hechas. */
  varon: AwardCount[];
  /** Menos eliminaciones hechas (el 0 cuenta). */
  gay: AwardCount[];
  /** Veces en el top 3 de una noche. */
  podios: AwardCount[];
  /** Fechas ganadas; el premio pide 2 o mas. */
  victorias: AwardCount[];
  /** Veces en el 7/2 de la noche (los dos primeros en salir). */
  sieteYDos: SieteDosCount[];
  /** Jugaron y nunca hicieron podio. */
  sinPodio: string[];
  /** Fechas a las que no fueron. */
  faltas: AwardCount[];
  /** Veces en el top 9 (mesa final). */
  mesasFinales: AwardCount[];
}

/** Por jugador inscrito, lo que paso noche a noche. */
interface PlayerTally {
  played: number;
  absences: number;
  wins: number;
  seconds: number;
  thirds: number;
  podiums: number;
  finalTables: number;
  dos: number;
  siete: number;
  eliminationsMade: number;
  eliminationsReceived: number;
}

function sortedDates(dates: readonly TSGameDate[]): TSGameDate[] {
  return [...dates].sort((a, b) => a.dateNumber - b.dateNumber);
}

function tallies(input: TSInput, nights: NightResult[]): Map<string, PlayerTally> {
  const registered = new Set(input.registeredIds);
  const t = new Map<string, PlayerTally>();
  input.registeredIds.forEach(id => t.set(id, {
    played: 0, absences: 0, wins: 0, seconds: 0, thirds: 0, podiums: 0, finalTables: 0,
    dos: 0, siete: 0, eliminationsMade: 0, eliminationsReceived: 0,
  }));
  nights.forEach(n => {
    n.positions.forEach((pos, id) => {
      const x = t.get(id);
      if (!x) return;
      x.played++;
      if (pos === 1) x.wins++;
      else x.eliminationsReceived++;
      if (pos === 2) x.seconds++;
      if (pos === 3) x.thirds++;
      if (pos <= 3) x.podiums++;
      if (pos <= 9) x.finalTables++;
    });
    n.absentIds.forEach(id => { const x = t.get(id); if (x) x.absences++; });
    if (n.dosId && registered.has(n.dosId)) t.get(n.dosId)!.dos++;
    if (n.sieteId && registered.has(n.sieteId)) t.get(n.sieteId)!.siete++;
    n.eliminationsBy.forEach((c, id) => { const x = t.get(id); if (x) x.eliminationsMade += c; });
  });
  return t;
}

export function computeTournamentAwardsData(input: TSInput): TournamentAwardsData {
  const registered = new Set(input.registeredIds);
  const nights = sortedDates(input.gameDates).map(d => nightResult(d, registered));
  const t = tallies(input, nights);
  const names = new Map(input.players.map(p => [p.id, p.name]));
  const byName = (a: string, b: string) => (names.get(a) ?? a).localeCompare(names.get(b) ?? b, 'es');
  const rank = (pick: (x: PlayerTally) => number, filter: (c: number) => boolean = c => c > 0): AwardCount[] =>
    [...t].map(([playerId, x]) => ({ playerId, count: pick(x) }))
      .filter(a => filter(a.count))
      .sort((a, b) => b.count - a.count || byName(a.playerId, b.playerId));

  const made = rank(x => x.eliminationsMade, () => true);
  const maxMade = made[0]?.count ?? 0;
  const minMade = made.length > 0 ? Math.min(...made.map(m => m.count)) : 0;

  const sieteYDos: SieteDosCount[] = [...t]
    .map(([playerId, x]) => ({ playerId, count: x.dos + x.siete, dosCount: x.dos, sieteCount: x.siete }))
    .filter(a => a.count > 0)
    .sort((a, b) => b.count - a.count || b.dosCount - a.dosCount || byName(a.playerId, b.playerId));

  return {
    varon: maxMade > 0 ? made.filter(m => m.count === maxMade) : [],
    gay: made.filter(m => m.count === minMade).sort((a, b) => byName(a.playerId, b.playerId)),
    podios: rank(x => x.podiums),
    victorias: rank(x => x.wins, c => c > 1),
    sieteYDos,
    sinPodio: [...t].filter(([, x]) => x.played > 0 && x.podiums === 0).map(([id]) => id).sort(byName),
    faltas: rank(x => x.absences),
    mesasFinales: rank(x => x.finalTables),
  };
}

// ---------------------------------------------------------------------------
// Rivalidades y Padre e Hijo
// ---------------------------------------------------------------------------

export interface EliminationPair<D> {
  eliminatorId: string;
  eliminatedId: string;
  count: number;
  first: D;
  last: D;
}

/** Minimo de eliminaciones al mismo jugador para que la relacion P&H este activa. */
export const PARENT_CHILD_MIN = 3;

/**
 * Quien elimino a quien y cuantas veces. Las eliminaciones deben venir en orden
 * cronologico; se ignora la fila del ganador (posicion 1). Con `eligible`, solo
 * cuentan las parejas donde los dos estan en el conjunto (P&H: inscritos que no
 * son invitados).
 */
export function aggregateEliminationPairs<D>(
  eliminations: ReadonlyArray<{ eliminatorPlayerId: string; eliminatedPlayerId: string; position: number; date: D }>,
  eligible?: ReadonlySet<string>
): EliminationPair<D>[] {
  const map = new Map<string, EliminationPair<D>>();
  eliminations.forEach(e => {
    if (e.position === 1) return;
    if (eligible && (!eligible.has(e.eliminatorPlayerId) || !eligible.has(e.eliminatedPlayerId))) return;
    const key = `${e.eliminatorPlayerId}->${e.eliminatedPlayerId}`;
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      cur.last = e.date;
    } else {
      map.set(key, { eliminatorId: e.eliminatorPlayerId, eliminatedId: e.eliminatedPlayerId, count: 1, first: e.date, last: e.date });
    }
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// El reporte completo
// ---------------------------------------------------------------------------

export interface ReportPlayerStats {
  playerId: string;
  name: string;
  position: number;
  finalScore: number;
  totalPoints: number;
  pointPenalty: number;
  attendances: number;
  absences: number;
  wins: number;
  seconds: number;
  thirds: number;
  podiums: number;
  finalTables: number;
  dos: number;
  siete: number;
  sieteYDos: number;
  eliminationsMade: number;
  eliminationsReceived: number;
  bestNight: number | null;
  worstNight: number | null;
  averageNight: number | null;
  averagePoints: number | null;
  longestFinalTableStreak: number;
  longestAttendanceStreak: number;
  datesAsLeader: number;
  bestTablePosition: number | null;
  worstTablePosition: number | null;
  biggestRise: { positions: number; dateNumber: number } | null;
  biggestDrop: { positions: number; dateNumber: number } | null;
  /** Puesto en la tabla despues de cada fecha (mismo orden que `dates`). */
  evolution: number[];
  /** Fechas que el ELIMINA le descarta. */
  discardedDates: number[];
}

export interface ReportExtreme {
  count: number;
  dateNumbers: number[];
}

export interface ReportSummary {
  tournamentNumber: number;
  tournamentName: string;
  status: string | null;
  datesPlayed: number;
  datesScheduled: number;
  eliminaRule: string;
  registeredPlayers: number;
  distinctGuests: number;
  totalParticipations: number;
  registeredParticipations: number;
  guestParticipations: number;
  averageAttendance: number | null;
  totalEliminations: number;
  maxAttendance: ReportExtreme | null;
  minAttendance: ReportExtreme | null;
  dateWinnersCount: number;
  dateWinners: string[];
  champion: string | null;
  runnerUp: string | null;
  third: string | null;
  /** Penultimo de la tabla. */
  siete: string | null;
  /** Ultimo de la tabla. */
  dos: string | null;
  /** No esta en la base: se completa a mano. */
  prizeMoney: number | null;
}

export interface ReportSummaryRow {
  label: string;
  value: string | number | null;
  detail?: string;
  /** La celda se completa a mano (no hay dato en la base). */
  fillIn?: boolean;
}

export interface ReportCuriosity {
  label: string;
  value: string;
  detail?: string;
}

export interface TournamentReportData {
  summary: ReportSummary;
  summaryRows: ReportSummaryRow[];
  dates: NightResult[];
  standings: PlayerRanking[];
  players: ReportPlayerStats[];
  awards: TournamentAwardsData;
  /** Lider(es) de la tabla despues de cada fecha. */
  leaders: string[][];
  leaderChanges: number;
  pairs: EliminationPair<number>[];
  parentChild: EliminationPair<string>[];
  curiosities: ReportCuriosity[];
  names: Map<string, string>;
  datesToEliminate: number;
}

/** Hojas del Excel, en orden. Las pantallas de Reportes muestran esta lista. */
export const REPORT_SHEETS = [
  { name: 'Resumen', description: 'Ficha del torneo para la presentación: fechas, asistencia, eliminaciones, podio y 7/2.' },
  { name: 'Tabla abierta', description: 'Puesto y puntos de cada jugador en cada fecha, faltas y fechas descartadas por el ELIMINA, ACUM., PUNTOS y posición final.' },
  { name: 'Podio y premios', description: 'Campeón, 2º, 3º, el 7/2 del torneo y las 8 categorías de premios.' },
  { name: 'Fecha por fecha', description: 'Asistentes, invitados, podio, 7/2 de la noche, Varón y malazo de cada fecha.' },
  { name: 'Estadísticas', description: 'Por jugador: asistencias, victorias, podios, mesas finales, 7/2, eliminaciones, promedios, rachas y subidas.' },
  { name: 'Evolución', description: 'Puesto de cada jugador en la tabla después de cada fecha.' },
  { name: 'Rivalidades y P&H', description: 'Quién eliminó más veces a quién y las relaciones Padre e Hijo activas.' },
  { name: 'Matriz eliminaciones', description: 'Cruce completo de quién eliminó a quién.' },
  { name: 'Resultados por fecha', description: 'El registro de cada fecha: posición, jugador, eliminado por y puntos.' },
  { name: 'Curiosidades', description: 'Récords y datos para la presentación: líderes, diferencias, empates, subidas.' },
  { name: 'Días sin ganar', description: 'Última victoria de cada jugador, contada hasta la última fecha del torneo.' },
] as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

function longestRun(flags: boolean[]): number {
  let best = 0;
  let cur = 0;
  flags.forEach(f => { cur = f ? cur + 1 : 0; best = Math.max(best, cur); });
  return best;
}

function extreme(nights: NightResult[], pick: 'max' | 'min'): ReportExtreme | null {
  if (nights.length === 0) return null;
  const counts = nights.map(n => n.players);
  const target = pick === 'max' ? Math.max(...counts) : Math.min(...counts);
  return { count: target, dateNumbers: nights.filter(n => n.players === target).map(n => n.dateNumber) };
}

/** Que criterio de desempate separa a dos jugadores con los mismos PUNTOS. */
export function tiebreakReason(a: PlayerRanking, b: PlayerRanking): string {
  if (a.firstPlaces !== b.firstPlaces) return 'victorias';
  if (a.secondPlaces !== b.secondPlaces) return 'segundos lugares';
  if (a.thirdPlaces !== b.thirdPlaces) return 'terceros lugares';
  if (a.lastPlaces !== b.lastPlaces) return 'menos veces último de la noche';
  if (a.secondToLastPlaces !== b.secondToLastPlaces) return 'menos veces penúltimo de la noche';
  if (a.totalPoints !== b.totalPoints) return 'ACUM.';
  return 'orden alfabético';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const datesLabel = (ds: number[]) => (ds.length === 1 ? `Fecha ${ds[0]}` : `Fechas ${ds.join(', ')}`);

export function buildTournamentReport(input: TSInput): TournamentReportData {
  const names = new Map(input.players.map(p => [p.id, p.name]));
  const nameOf = (id: string | null | undefined) => (id ? names.get(id) ?? id : '');
  const registered = new Set(input.registeredIds);
  const dates = sortedDates(input.gameDates);
  const nights = dates.map(d => nightResult(d, registered));
  const tally = tallies(input, nights);
  const datesToEliminate = input.tournament.datesToEliminate ?? 2;
  const totalDates = input.tournament.totalDates ?? 12;

  const standingsPlayers = input.registeredIds.map(id => ({ id, name: nameOf(id) }));
  const options = { totalDates, datesToEliminate };
  const { rankings: standings } = computeStandings(standingsPlayers, dates, { ...options, pointPenalties: input.pointPenalties });

  // Tabla despues de cada fecha. Las multas de puntos no tienen fecha, asi que
  // se aplican solo en la tabla final (la oficial).
  const prefixes = dates.map((_, k) =>
    k === dates.length - 1
      ? standings
      : computeStandings(standingsPlayers, dates.slice(0, k + 1), options).rankings
  );
  const positionAt = prefixes.map(r => new Map(r.map(p => [p.playerId, p.position])));
  const leaders = prefixes.map(r => r.filter(p => p.position === 1).map(p => p.playerId));
  let leaderChanges = 0;
  leaders.forEach((l, i) => { if (i > 0 && l.join() !== leaders[i - 1].join()) leaderChanges++; });

  const players: ReportPlayerStats[] = standings.map(r => {
    const x = tally.get(r.playerId)!;
    const nightPositions = nights.map(n => n.positions.get(r.playerId) ?? null);
    const played = nightPositions.filter((p): p is number => p !== null);
    const evolution = positionAt.map(m => m.get(r.playerId) ?? 0);
    let rise: ReportPlayerStats['biggestRise'] = null;
    let drop: ReportPlayerStats['biggestDrop'] = null;
    for (let k = 1; k < evolution.length; k++) {
      const delta = evolution[k - 1] - evolution[k];
      if (delta > 0 && (!rise || delta > rise.positions)) rise = { positions: delta, dateNumber: nights[k].dateNumber };
      if (delta < 0 && (!drop || -delta > drop.positions)) drop = { positions: -delta, dateNumber: nights[k].dateNumber };
    }
    const playedPoints = nights.map(n => n.points.get(r.playerId)).filter((p): p is number => p !== undefined);
    return {
      playerId: r.playerId,
      name: r.playerName,
      position: r.position,
      finalScore: scoreOf(r),
      totalPoints: r.totalPoints,
      pointPenalty: r.pointPenalty ?? 0,
      attendances: x.played,
      absences: x.absences,
      wins: x.wins,
      seconds: x.seconds,
      thirds: x.thirds,
      podiums: x.podiums,
      finalTables: x.finalTables,
      dos: x.dos,
      siete: x.siete,
      sieteYDos: x.dos + x.siete,
      eliminationsMade: x.eliminationsMade,
      eliminationsReceived: x.eliminationsReceived,
      bestNight: played.length ? Math.min(...played) : null,
      worstNight: played.length ? Math.max(...played) : null,
      averageNight: played.length ? round1(played.reduce((s, p) => s + p, 0) / played.length) : null,
      averagePoints: playedPoints.length ? round1(playedPoints.reduce((s, p) => s + p, 0) / playedPoints.length) : null,
      longestFinalTableStreak: longestRun(nightPositions.map(p => p !== null && p <= 9)),
      longestAttendanceStreak: longestRun(nightPositions.map(p => p !== null)),
      datesAsLeader: leaders.filter(l => l.includes(r.playerId)).length,
      bestTablePosition: evolution.length ? Math.min(...evolution) : null,
      worstTablePosition: evolution.length ? Math.max(...evolution) : null,
      biggestRise: rise,
      biggestDrop: drop,
      evolution,
      discardedDates: [...eliminatedDateNumbers(r, datesToEliminate)].sort((a, b) => a - b),
    };
  });

  // ---- Resumen
  const guestIds = new Set<string>();
  nights.forEach(n => dates.find(d => d.dateNumber === n.dateNumber)!.playerIds.forEach(id => { if (!registered.has(id)) guestIds.add(id); }));
  const totalParticipations = nights.reduce((s, n) => s + n.players, 0);
  const registeredParticipations = nights.reduce((s, n) => s + n.registeredPresent, 0);
  const winners = [...new Set(nights.map(n => n.winnerId).filter((id): id is string => !!id))];
  const podium = [...standings].sort((a, b) => a.position - b.position);
  const sd = tournamentSieteDos(standings);
  const summary: ReportSummary = {
    tournamentNumber: input.tournament.number,
    tournamentName: input.tournament.name,
    status: input.tournament.status ?? null,
    datesPlayed: nights.length,
    datesScheduled: totalDates,
    eliminaRule: `Cuentan las mejores ${totalDates - datesToEliminate} de ${totalDates} fechas (se descartan las ${datesToEliminate} peores)`,
    registeredPlayers: input.registeredIds.length,
    distinctGuests: guestIds.size,
    totalParticipations,
    registeredParticipations,
    guestParticipations: totalParticipations - registeredParticipations,
    averageAttendance: nights.length ? round1(totalParticipations / nights.length) : null,
    totalEliminations: dates.reduce((s, d) => s + d.eliminations.filter(e => e.position !== 1).length, 0),
    maxAttendance: extreme(nights, 'max'),
    minAttendance: extreme(nights, 'min'),
    dateWinnersCount: winners.length,
    dateWinners: winners.map(nameOf).sort((a, b) => a.localeCompare(b, 'es')),
    champion: podium[0]?.playerName ?? null,
    runnerUp: podium[1]?.playerName ?? null,
    third: podium[2]?.playerName ?? null,
    siete: sd?.siete.playerName ?? null,
    dos: sd?.dos.playerName ?? null,
    prizeMoney: null,
  };

  const scoreOfPos = (i: number) => (podium[i] ? scoreOf(podium[i]) : null);
  const summaryRows: ReportSummaryRow[] = [
    { label: 'Fechas disputadas', value: summary.datesPlayed, detail: `de ${summary.datesScheduled} programadas` },
    { label: 'Sistema ELIMINA', value: `${datesToEliminate} peores fechas`, detail: summary.eliminaRule },
    { label: 'Jugadores inscritos', value: summary.registeredPlayers },
    { label: 'Invitados diferentes', value: summary.distinctGuests },
    { label: 'Total de participaciones', value: summary.totalParticipations, detail: `${summary.registeredParticipations} de inscritos y ${summary.guestParticipations} de invitados` },
    { label: 'Asistencia promedio por fecha', value: summary.averageAttendance },
    { label: 'Total de eliminaciones', value: summary.totalEliminations },
    { label: 'Mayor asistencia', value: summary.maxAttendance?.count ?? null, detail: summary.maxAttendance ? datesLabel(summary.maxAttendance.dateNumbers) : undefined },
    { label: 'Menor asistencia', value: summary.minAttendance?.count ?? null, detail: summary.minAttendance ? datesLabel(summary.minAttendance.dateNumbers) : undefined },
    { label: 'Jugadores que ganaron al menos una fecha', value: summary.dateWinnersCount, detail: summary.dateWinners.join(', ') },
    { label: 'Campeón', value: summary.champion, detail: scoreOfPos(0) !== null ? `${scoreOfPos(0)} puntos` : undefined },
    { label: 'Segundo', value: summary.runnerUp, detail: scoreOfPos(1) !== null ? `${scoreOfPos(1)} puntos` : undefined },
    { label: 'Tercero', value: summary.third, detail: scoreOfPos(2) !== null ? `${scoreOfPos(2)} puntos` : undefined },
    { label: 'El 7 del torneo (penúltimo)', value: summary.siete, detail: sd ? `${scoreOf(sd.siete)} puntos` : undefined },
    { label: 'El 2 del torneo (último)', value: summary.dos, detail: sd ? `${scoreOf(sd.dos)} puntos` : undefined },
    { label: 'Total de dinero repartido en premios', value: null, detail: 'No está en el sistema: completar', fillIn: true },
  ];

  // ---- Premios, rivalidades
  const awards = computeTournamentAwardsData(input);
  const chronological = dates.flatMap(d => d.eliminations.map(e => ({ ...e, date: d.dateNumber })));
  const pairs = aggregateEliminationPairs(chronological);
  const eligible = new Set(input.players.filter(p => registered.has(p.id) && p.role !== 'Invitado').map(p => p.id));
  const parentChild = aggregateEliminationPairs(
    dates.flatMap(d => d.eliminations.map(e => ({ ...e, date: d.scheduledDate }))),
    eligible
  ).filter(p => p.count >= PARENT_CHILD_MIN);

  // ---- Curiosidades
  const curiosities: ReportCuriosity[] = [];
  if (summary.maxAttendance) curiosities.push({ label: 'Fecha con más jugadores', value: plural(summary.maxAttendance.count, 'jugador', 'jugadores'), detail: datesLabel(summary.maxAttendance.dateNumbers) });
  if (summary.minAttendance) curiosities.push({ label: 'Fecha con menos jugadores', value: plural(summary.minAttendance.count, 'jugador', 'jugadores'), detail: datesLabel(summary.minAttendance.dateNumbers) });
  if (podium.length >= 2) curiosities.push({ label: 'Diferencia entre el 1º y el 2º', value: plural(scoreOf(podium[0]) - scoreOf(podium[1]), 'punto', 'puntos'), detail: `${podium[0].playerName} ${scoreOf(podium[0])} · ${podium[1].playerName} ${scoreOf(podium[1])}` });
  if (podium.length >= 3) curiosities.push({ label: 'Diferencia entre el 2º y el 3º', value: plural(scoreOf(podium[1]) - scoreOf(podium[2]), 'punto', 'puntos'), detail: `${podium[1].playerName} ${scoreOf(podium[1])} · ${podium[2].playerName} ${scoreOf(podium[2])}` });

  const ties: string[] = [];
  for (let i = 1; i < podium.length; i++) {
    if (scoreOf(podium[i]) === scoreOf(podium[i - 1])) {
      ties.push(`${podium[i - 1].position}º ${podium[i - 1].playerName} y ${podium[i].position}º ${podium[i].playerName} con ${scoreOf(podium[i])} (desempata ${tiebreakReason(podium[i - 1], podium[i])})`);
    }
  }
  curiosities.push({ label: 'Empates en PUNTOS en la tabla final', value: ties.length ? plural(ties.length, 'empate', 'empates') : 'Ninguno', detail: ties.join(' · ') || undefined });

  if (leaders.length > 0) {
    const sequence: string[] = [];
    leaders.forEach((l, i) => {
      if (i === 0 || l.join() !== leaders[i - 1].join()) sequence.push(`F${nights[i].dateNumber} ${l.map(nameOf).join(' / ')}`);
    });
    curiosities.push({ label: 'Cambios de líder', value: plural(leaderChanges, 'cambio', 'cambios'), detail: sequence.join(' → ') });
    const most = Math.max(...players.map(p => p.datesAsLeader));
    const who = players.filter(p => p.datesAsLeader === most && most > 0).map(p => p.name);
    if (who.length) curiosities.push({ label: 'Lideró más fechas', value: who.join(', '), detail: `${plural(most, 'fecha', 'fechas')} de ${nights.length} como líder` });
  }

  // En los records se listan todos los empatados, no solo el primero.
  const maxOf = <T>(xs: T[], val: (x: T) => number) => {
    if (xs.length === 0) return { best: 0, all: [] as T[] };
    const best = Math.max(...xs.map(val));
    return { best, all: xs.filter(x => val(x) === best) };
  };

  const rises = maxOf(players.filter(p => p.biggestRise), p => p.biggestRise!.positions);
  if (rises.all.length) curiosities.push({ label: 'Mayor subida en una fecha', value: `+${rises.best} puestos`, detail: rises.all.map(p => `${p.name} (Fecha ${p.biggestRise!.dateNumber})`).join(', ') });
  const drops = maxOf(players.filter(p => p.biggestDrop), p => p.biggestDrop!.positions);
  if (drops.all.length) curiosities.push({ label: 'Mayor caída en una fecha', value: `-${drops.best} puestos`, detail: drops.all.map(p => `${p.name} (Fecha ${p.biggestDrop!.dateNumber})`).join(', ') });

  const nightScores = nights.flatMap(n => [...n.points].map(([id, pts]) => ({ id, pts, date: n.dateNumber, players: n.players })));
  const bestNights = maxOf(nightScores, x => x.pts);
  if (bestNights.all.length) curiosities.push({ label: 'Más puntos en una noche', value: plural(bestNights.best, 'punto', 'puntos'), detail: bestNights.all.map(x => `${nameOf(x.id)} (Fecha ${x.date}, ${x.players} jugadores)`).join(', ') });

  const varonNights = maxOf(nights.filter(n => n.varonCount > 0), n => n.varonCount);
  if (varonNights.all.length) curiosities.push({ label: 'Más eliminaciones en una sola noche', value: plural(varonNights.best, 'eliminación', 'eliminaciones'), detail: varonNights.all.map(n => `${n.varonIds.map(nameOf).join(', ')} (Fecha ${n.dateNumber})`).join(', ') });

  const multiWinners = players.filter(p => p.wins >= 2).map(p => `${p.name} (${p.wins})`);
  curiosities.push({ label: 'Ganadores distintos', value: `${winners.length} en ${nights.length} fechas`, detail: multiWinners.length ? `Repitieron: ${multiWinners.join(', ')}` : 'Nadie repitió' });
  const guestWins = nights.filter(n => n.winnerId && !registered.has(n.winnerId));
  if (guestWins.length) curiosities.push({ label: 'Fechas ganadas por invitados', value: String(guestWins.length), detail: guestWins.map(n => `F${n.dateNumber} ${nameOf(n.winnerId)}`).join(', ') });
  const perfect = players.filter(p => p.absences === 0 && nights.length > 0).map(p => p.name);
  curiosities.push({ label: 'Asistencia perfecta', value: perfect.length ? plural(perfect.length, 'jugador', 'jugadores') : 'Nadie', detail: perfect.join(', ') || undefined });

  const topPairs = maxOf(pairs, p => p.count);
  if (topPairs.all.length) curiosities.push({ label: 'La rivalidad más repetida', value: plural(topPairs.best, 'eliminación', 'eliminaciones'), detail: topPairs.all.map(p => `${nameOf(p.eliminatorId)} → ${nameOf(p.eliminatedId)}`).join(', ') });

  const topSD = maxOf(awards.sieteYDos, s => s.count);
  if (topSD.all.length) curiosities.push({ label: 'Más veces en el 7/2 de la noche', value: plural(topSD.best, 'vez', 'veces'), detail: topSD.all.map(s => `${nameOf(s.playerId)} (${s.dosCount} veces 2, ${s.sieteCount} veces 7)`).join(', ') });

  return {
    summary,
    summaryRows,
    dates: nights,
    standings,
    players,
    awards,
    leaders,
    leaderChanges,
    pairs,
    parentChild,
    curiosities,
    names,
    datesToEliminate,
  };
}

/** Lo que muestran las pantallas de Reportes (mismos numeros que la hoja Resumen). */
export interface TournamentReportSummaryResponse {
  summary: ReportSummary;
  rows: ReportSummaryRow[];
  sheets: ReadonlyArray<{ name: string; description: string }>;
}

