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

// Blind levels por defecto (12 niveles)
export const DEFAULT_BLIND_LEVELS = [
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 20 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 20 },
  { level: 3, smallBlind: 150, bigBlind: 300, duration: 20 },
  { level: 4, smallBlind: 200, bigBlind: 400, duration: 20 },
  { level: 5, smallBlind: 300, bigBlind: 600, duration: 20 },
  { level: 6, smallBlind: 400, bigBlind: 800, duration: 20 },
  { level: 7, smallBlind: 500, bigBlind: 1000, duration: 15 },
  { level: 8, smallBlind: 700, bigBlind: 1400, duration: 15 },
  { level: 9, smallBlind: 1000, bigBlind: 2000, duration: 15 },
  { level: 10, smallBlind: 1500, bigBlind: 3000, duration: 15 },
  { level: 11, smallBlind: 2000, bigBlind: 4000, duration: 15 },
  { level: 12, smallBlind: 2500, bigBlind: 5000, duration: 15 },
] as const;

// Configuración del timer
export const TIMER_CONFIG = {
  DEFAULT_LEVEL_DURATION_MINUTES: 20,
  SHORT_LEVEL_DURATION_MINUTES: 15,
  DINNER_BREAK_AFTER_LEVEL: 6,
} as const;

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

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
