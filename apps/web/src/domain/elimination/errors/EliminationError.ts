/**
 * Base class for all elimination domain errors.
 * Allows catching all elimination errors with a single type.
 */
export abstract class EliminationError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when attempting to eliminate a player who was already eliminated in the same game date.
 */
export class PlayerAlreadyEliminatedError extends EliminationError {
  readonly code = 'PLAYER_ALREADY_ELIMINATED';

  constructor(public readonly playerId: string) {
    super('Ese jugador ya fue eliminado en esta fecha');
  }
}

/**
 * Thrown when attempting to use a position that's already taken.
 */
export class PositionAlreadyTakenError extends EliminationError {
  readonly code = 'POSITION_ALREADY_TAKEN';

  constructor(public readonly position: number) {
    super(`La posición ${position} ya está registrada`);
  }
}

/**
 * Thrown when the eliminator was eliminated before the current position.
 */
export class InvalidEliminatorError extends EliminationError {
  readonly code = 'INVALID_ELIMINATOR';

  constructor(
    public readonly eliminatorId: string,
    public readonly eliminatorPosition: number
  ) {
    super(
      `El eliminador ya había salido en la posición ${eliminatorPosition}`
    );
  }
}

/**
 * Thrown when the game date is not in a valid state for eliminations.
 */
export class GameDateNotInProgressError extends EliminationError {
  readonly code = 'GAME_DATE_NOT_IN_PROGRESS';

  constructor(
    public readonly gameDateId: number,
    public readonly currentStatus: string
  ) {
    super(
      `La fecha no está en curso (estado: ${currentStatus})`
    );
  }
}

/**
 * Thrown when position is outside valid range.
 */
export class InvalidPositionError extends EliminationError {
  readonly code = 'INVALID_POSITION';

  constructor(
    public readonly position: number,
    public readonly totalPlayers: number
  ) {
    super(
      `La posición ${position} no es válida para ${totalPlayers} jugadores`
    );
  }
}

/**
 * The game date, elimination or player does not exist.
 */
export class EliminationNotFoundError extends EliminationError {
  readonly code = 'NOT_FOUND';

  constructor(what: 'gameDate' | 'elimination' | 'player') {
    super(
      {
        gameDate: 'Fecha no encontrada',
        elimination: 'Eliminación no encontrada',
        player: 'Jugador no encontrado',
      }[what]
    );
  }
}

/**
 * The eliminator is the same player as the eliminated (only the winner, at
 * position 1, "eliminates" themselves).
 */
export class SelfEliminationError extends EliminationError {
  readonly code = 'SELF_ELIMINATION';

  constructor() {
    super('El eliminador no puede ser el mismo jugador eliminado');
  }
}

/**
 * The eliminated or eliminator player is not a participant of the game date.
 */
export class PlayerNotInGameDateError extends EliminationError {
  readonly code = 'PLAYER_NOT_IN_GAME_DATE';

  constructor(
    public readonly playerId: string,
    public readonly role: 'eliminated' | 'eliminator'
  ) {
    super(
      role === 'eliminated'
        ? 'El jugador eliminado no participa en esta fecha'
        : 'El eliminador no participa en esta fecha'
    );
  }
}

/**
 * The position is not the next free one (positions are filled from the last
 * place upwards, without gaps).
 */
export class PositionNotNextError extends EliminationError {
  readonly code = 'POSITION_NOT_NEXT';

  constructor(
    public readonly position: number,
    public readonly expected: number
  ) {
    super(`La posición ${position} no es la siguiente; corresponde la ${expected}`);
  }
}

/**
 * Only the most recent elimination (lowest position) can be deleted.
 */
export class NotLastEliminationError extends EliminationError {
  readonly code = 'NOT_LAST_ELIMINATION';

  constructor() {
    super('Solo se puede borrar la última eliminación registrada. Borra primero las posteriores.');
  }
}

/**
 * Request body is malformed or has wrong types.
 */
export class InvalidEliminationInputError extends EliminationError {
  readonly code = 'INVALID_INPUT';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Two concurrent writes collided on a unique constraint.
 */
export class EliminationConflictError extends EliminationError {
  readonly code = 'ELIMINATION_CONFLICT';

  constructor() {
    super('Otra eliminación se registró al mismo tiempo para esa posición o jugador. Revisa la lista.');
  }
}
