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
    super(`Player ${playerId} has already been eliminated in this game date`);
  }
}

/**
 * Thrown when attempting to use a position that's already taken.
 */
export class PositionAlreadyTakenError extends EliminationError {
  readonly code = 'POSITION_ALREADY_TAKEN';

  constructor(public readonly position: number) {
    super(`Position ${position} is already taken`);
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
      `Player ${eliminatorId} cannot be the eliminator - they were eliminated at position ${eliminatorPosition}`
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
      `Game date ${gameDateId} is not in progress (current status: ${currentStatus})`
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
      `Position ${position} is invalid for ${totalPlayers} players (must be between 1 and ${totalPlayers})`
    );
  }
}
