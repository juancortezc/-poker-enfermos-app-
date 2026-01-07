/**
 * Base class for all ranking domain errors.
 */
export abstract class RankingError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a tournament is not found.
 */
export class TournamentNotFoundError extends RankingError {
  readonly code = 'TOURNAMENT_NOT_FOUND';

  constructor(public readonly tournamentId: number) {
    super(`Tournament ${tournamentId} not found`);
  }
}

/**
 * Thrown when a player is not found in the ranking.
 */
export class PlayerNotInRankingError extends RankingError {
  readonly code = 'PLAYER_NOT_IN_RANKING';

  constructor(
    public readonly playerId: string,
    public readonly tournamentId: number
  ) {
    super(`Player ${playerId} is not in the ranking for tournament ${tournamentId}`);
  }
}

/**
 * Thrown when there are no completed dates to calculate ranking.
 */
export class NoCompletedDatesError extends RankingError {
  readonly code = 'NO_COMPLETED_DATES';

  constructor(public readonly tournamentId: number) {
    super(`Tournament ${tournamentId} has no completed dates for ranking calculation`);
  }
}
