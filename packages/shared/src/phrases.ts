/**
 * Frases del Inicio en tono de lucha libre (T31). Web y app usan las mismas.
 *
 * - Cada contexto tiene su banco; `{n}` es el apodo o nombre corto y `{d}` la
 *   diferencia de puntos.
 * - La elección es determinista por fecha (`seed` = número de fecha): la misma
 *   frase en web y app y al recargar, y nunca la misma que la fecha anterior.
 * - Cada frase es [línea 1, línea 2]: el diseño pinta la segunda en otro color.
 *
 * Para ajustar el tono basta con editar los bancos: el resto no cambia.
 */

export type Phrase = readonly [string, string]

const NIGHT_WINNER: readonly Phrase[] = [
  ['¡{n} se llevó', 'la noche!'],
  ['¡{n} levantó', 'el brazo!'],
  ['¡Cuenta de tres:', 'ganó {n}!'],
  ['¡{n} limpió', 'el ring!'],
  ['¡{n} dejó a todos', 'en la lona!'],
  ['¡Se rifó {n}:', 'campeón de la noche!'],
  ['¡{n} aplicó', 'la llave final!'],
  ['¡Nadie pudo', 'con {n}!'],
  ['¡{n} se subió', 'a la tercera cuerda!'],
  ['¡Rindió a todos', '{n}!'],
  ['¡Ni el réferi', 'paró a {n}!'],
  ['¡{n} es', 'el rey del ring!'],
]

/** Primera victoria de este jugador en el torneo. */
const FIRST_WIN: readonly Phrase[] = [
  ['¡Por fin', '{n} sabe lo que es ganar!'],
  ['¡Debut glorioso:', 'primera de {n}!'],
  ['¡{n} se estrena', 'como campeón!'],
  ['¡Primera vez', 'que {n} levanta el brazo!'],
]

/** Ya había ganado otra fecha del torneo. */
const REPEAT_WIN: readonly Phrase[] = [
  ['¡{n} lo hizo', 'otra vez!'],
  ['¡{n} ya le agarró', 'el gusto al ring!'],
  ['¡Repite {n}:', 'que alguien lo pare!'],
  ['¡{n} colecciona', 'victorias!'],
]

/** El líder sigue siendo el mismo que la fecha anterior. */
const LEADER_KEEPS: readonly Phrase[] = [
  ['{n} defiende', 'el cinturón'],
  ['{n} no suelta', 'el cinturón'],
  ['El cinturón sigue', 'en manos de {n}'],
  ['{n} retiene', 'el título'],
  ['Nadie le quita', 'el cinturón a {n}'],
]

/** Hay un líder nuevo. */
const NEW_LEADER: readonly Phrase[] = [
  ['¡{n} le arrebató', 'el cinturón!'],
  ['¡Nuevo campeón:', '{n}!'],
  ['¡{n} se trepó', 'a la cima!'],
  ['¡Cambio de dueño:', 'el cinturón es de {n}!'],
]

/** Frase del mano a mano entre el #1 y el #2. */
export function rivalryPhrase(diff: number): string {
  if (diff <= 0) return '¡EMPATADOS EN LA CIMA!'
  if (diff === 1) return '¡A UN PUNTO DEL CINTURÓN!'
  return `¡A ${diff} PUNTOS DEL CINTURÓN!`
}

function pick(bank: readonly Phrase[], seed: number): number {
  const s = Math.abs(Math.trunc(seed))
  // Multiplicador coprimo con cualquier largo de banco usado aquí: recorre todo
  // el banco antes de repetir y dos fechas seguidas nunca caen en el mismo índice.
  return (s * 7 + 3) % bank.length
}

function fill(p: Phrase, name: string, diff?: number): Phrase {
  const f = (t: string) => t.replace('{n}', name).replace('{d}', String(diff ?? ''))
  return [f(p[0]), f(p[1])]
}

/**
 * Frase del ganador de la noche.
 * @param seed número de la fecha
 * @param winsInTournament victorias del ganador en el torneo, contando esta
 */
export function nightWinnerPhrase(name: string, seed: number, winsInTournament?: number): Phrase {
  // Dos de cada tres fechas usan el banco del contexto; la otra, el general,
  // para que tampoco se repita "otra vez" en cada fecha de un mismo jugador.
  const general = seed % 3 === 0 || winsInTournament === undefined
  const bank = general ? NIGHT_WINNER : winsInTournament <= 1 ? FIRST_WIN : REPEAT_WIN
  return fill(bank[pick(bank, seed)], name)
}

/**
 * Frase del líder del torneo.
 * @param seed número de la última fecha jugada
 * @param leaderChanged true si el líder no era el mismo antes de esta fecha
 */
export function leaderPhrase(name: string, seed: number, leaderChanged: boolean): Phrase {
  const bank = leaderChanged ? NEW_LEADER : LEADER_KEEPS
  return fill(bank[pick(bank, seed)], name)
}

/** Para pruebas y para revisar el tono: todos los bancos. */
export const PHRASE_BANKS = { NIGHT_WINNER, FIRST_WIN, REPEAT_WIN, LEADER_KEEPS, NEW_LEADER } as const
