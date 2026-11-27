/**
 * El torneo que arranca: mientras el torneo activo no tiene ninguna fecha
 * jugada no hay tabla que mostrar (todos en 0, en el orden en que se
 * inscribieron), asi que la web y la app muestran el afiche del torneo.
 *
 * Aqui va lo que ambas comparten: cuando un torneo "tiene resultados", que
 * torneos tienen afiche y el texto de la proxima fecha. La imagen en si vive
 * en cada app (web: `apps/web/public/torneos/`, app: `apps/mobile/assets/torneos/`)
 * con el nombre que da `tournamentPoster(n).file`.
 */

/** Lo minimo de una fila del ranking para saber si alguien ya jugo. */
type RankingLike = {
  datesPlayed: number
  pointsByDate: { [dateNumber: number]: number }
  liveProjection?: unknown
}

/**
 * true si el torneo ya tiene algo que ordenar: una fecha jugada por alguien o
 * una fecha en curso (la proyeccion en vivo). Sin eso, la tabla es una lista
 * en 0 ordenada al azar y no se muestra.
 */
export function tournamentHasResults(rankings: ReadonlyArray<RankingLike>): boolean {
  return rankings.some(
    (r) => r.datesPlayed > 0 || Object.keys(r.pointsByDate ?? {}).length > 0 || r.liveProjection != null
  )
}

export interface TournamentPoster {
  /**
   * Nombre base del archivo, sin tamano ni extension. Cada app lo sirve en dos
   * anchos WebP 2:3: `<file>-1024.webp` (1024x1536) y `<file>-640.webp` (640x960).
   */
  file: string
  /** Texto alternativo del afiche. */
  alt: string
}

/**
 * Torneos con afiche propio. Al agregar uno: los dos WebP en
 * `apps/web/public/torneos/` y en `apps/mobile/assets/torneos/`, la entrada
 * aqui y el `require` en `apps/mobile/src/components/jugador/TournamentPoster.tsx`.
 */
export const TOURNAMENT_POSTERS: Readonly<Record<number, TournamentPoster>> = {
  31: { file: 'torneo-31', alt: 'Afiche del Torneo XXXI de Poker de Enfermos: lucha libre' },
}

/** Afiche del torneo, o null si no tiene (se muestra el afiche generico). */
export function tournamentPoster(tournamentNumber: number): TournamentPoster | null {
  return TOURNAMENT_POSTERS[tournamentNumber] ?? null
}

/** Numero romano (1 a 3999), como lo escriben los afiches: 31 → "XXXI". */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return String(n)
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let rest = n
  let out = ''
  for (const [value, symbol] of table) {
    while (rest >= value) {
      out += symbol
      rest -= value
    }
  }
  return out
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * "5 de enero". Las fechas se guardan a mediodia UTC (ver `parseToUTCNoon`),
 * asi que el dia UTC es el dia del calendario en cualquier zona del grupo.
 */
export function formatDayMonth(date: string | Date): string | null {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`
}

/** "Fecha 1 · 5 de enero"; sin dia programado, "Fecha 1 · por definir". */
export function nextDateLine(next: { dateNumber: number; scheduledDate?: string | null } | null | undefined): string | null {
  if (!next) return null
  const day = next.scheduledDate ? formatDayMonth(next.scheduledDate) : null
  return `Fecha ${next.dateNumber} · ${day ?? 'por definir'}`
}

/** "11 inscritos" / "1 inscrito". */
export function registeredPlayersLabel(count: number): string {
  return `${count} ${count === 1 ? 'inscrito' : 'inscritos'}`
}
