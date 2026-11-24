/**
 * Constantes del sistema de puntuación de Poker Enfermos
 *
 * Sistema ELIMINA 2: Los puntos se calculan según la posición de eliminación
 * y la cantidad total de jugadores en la fecha.
 */

// Límites de jugadores
export const MIN_PLAYERS = 9;
export const MAX_PLAYERS = 24;

// Incrementos de puntos por rango de posiciones
export const SCORING_RULES = {
  // Posiciones del final hasta la 10: +1 punto cada una
  BOTTOM_INCREMENT: 1,

  // Posición 9: +2 puntos respecto a posición 10
  POSITION_9_BONUS: 2,

  // Posiciones 8-4: +1 punto cada una
  MIDDLE_INCREMENT: 1,

  // Posiciones 3, 2, 1 (podio): +3 puntos cada una
  PODIUM_INCREMENT: 3,
} as const;

// Rangos de posiciones
export const POSITION_RANGES = {
  // Posiciones que reciben incremento de podio (1, 2, 3)
  PODIUM_POSITIONS: [1, 2, 3],

  // Posiciones que reciben incremento medio (4-8)
  MIDDLE_POSITIONS: [4, 5, 6, 7, 8],

  // Posición con bonus especial
  BONUS_POSITION: 9,

  // Posiciones desde 10 hasta el final
  BOTTOM_START: 10,
} as const;

// La estructura de blinds vive en blinds.ts (DEFAULT_BLIND_LEVELS,
// defaultBlindLevels). Aqui hubo una copia de 12 niveles que no coincidia con
// la que usa el grupo y que nadie importaba.

// Ranking ELIMINA 2: tomar las N mejores fechas
export const RANKING_CONFIG = {
  // Número de mejores fechas a considerar para ranking final
  BEST_DATES_COUNT: 10,

  // Número total de fechas por torneo
  TOTAL_DATES_PER_TOURNAMENT: 12,
} as const;

// Roles de usuario
export const USER_ROLES = {
  COMISION: 'Comision',
  ENFERMO: 'Enfermo',
  INVITADO: 'Invitado',
} as const;

