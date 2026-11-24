/**
 * Base class for all tournament domain errors.
 */
export abstract class TournamentError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class TournamentNotFoundError extends TournamentError {
  readonly code = 'TOURNAMENT_NOT_FOUND';

  constructor(public readonly tournamentId: number) {
    super(`Tournament ${tournamentId} not found`);
  }
}

export class TournamentAlreadyExistsError extends TournamentError {
  readonly code = 'TOURNAMENT_ALREADY_EXISTS';

  constructor(public readonly tournamentNumber: number) {
    super(`Tournament with number ${tournamentNumber} already exists`);
  }
}

export class ActiveTournamentExistsError extends TournamentError {
  readonly code = 'ACTIVE_TOURNAMENT_EXISTS';

  constructor() {
    super('An active tournament already exists. Complete it before creating a new one.');
  }
}

export class GameDateNotFoundError extends TournamentError {
  readonly code = 'GAME_DATE_NOT_FOUND';

  constructor(public readonly gameDateId: number) {
    super(`Game date ${gameDateId} not found`);
  }
}

export class InvalidGameDatesCountError extends TournamentError {
  readonly code = 'INVALID_GAME_DATES_COUNT';

  constructor(public readonly count: number) {
    super(`Tournament requires exactly 12 game dates, got ${count}`);
  }
}
