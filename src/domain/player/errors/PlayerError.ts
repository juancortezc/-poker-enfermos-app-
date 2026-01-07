/**
 * Base class for all player domain errors.
 */
export abstract class PlayerError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PlayerNotFoundError extends PlayerError {
  readonly code = 'PLAYER_NOT_FOUND';

  constructor(public readonly playerId: string) {
    super(`Player ${playerId} not found`);
  }
}

export class InvalidPlayerDataError extends PlayerError {
  readonly code = 'INVALID_PLAYER_DATA';

  constructor(message: string) {
    super(message);
  }
}

export class DuplicatePlayerError extends PlayerError {
  readonly code = 'DUPLICATE_PLAYER';

  constructor(
    public readonly firstName: string,
    public readonly lastName: string
  ) {
    super(`Player ${firstName} ${lastName} already exists`);
  }
}
