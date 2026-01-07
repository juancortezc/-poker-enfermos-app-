/**
 * Base class for all timer domain errors.
 */
export abstract class TimerError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class TimerNotFoundError extends TimerError {
  readonly code = 'TIMER_NOT_FOUND';

  constructor(public readonly gameDateId: number) {
    super(`Timer for game date ${gameDateId} not found`);
  }
}

export class TimerAlreadyActiveError extends TimerError {
  readonly code = 'TIMER_ALREADY_ACTIVE';

  constructor() {
    super('Timer is already active');
  }
}

export class TimerNotActiveError extends TimerError {
  readonly code = 'TIMER_NOT_ACTIVE';

  constructor() {
    super('Timer is not active');
  }
}

export class InvalidLevelError extends TimerError {
  readonly code = 'INVALID_LEVEL';

  constructor(public readonly level: number) {
    super(`Invalid blind level: ${level}`);
  }
}
