/**
 * Ranking Bounded Context - Domain Layer
 *
 * This module contains the core business logic for tournament rankings
 * including the ELIMINA 2 scoring system and tiebreaker resolution.
 *
 * Key concepts:
 * - TournamentRanking: Aggregate root with all player rankings
 * - PlayerRanking: Individual player's ranking data
 * - Elimina2Score: The "best 10 of 12" scoring calculation
 * - TiebreakerStats: Statistics for resolving ties
 * - RankingTrend: Position change compared to previous date
 * - RankingCalculator: Orchestrates the full calculation
 */

// Entities
export { PlayerRanking } from './entities/PlayerRanking';
export type { RankedPlayerInfo } from './entities/PlayerRanking';

export { TournamentRanking } from './entities/TournamentRanking';
export type { RankedTournamentInfo } from './entities/TournamentRanking';

// Value Objects
export { TiebreakerStats } from './value-objects/TiebreakerStats';
export { Elimina2Score } from './value-objects/Elimina2Score';
export { RankingTrend } from './value-objects/RankingTrend';

// Domain Services
export { RankingCalculator } from './services/RankingCalculator';
export type {
  GameDateParticipation,
  PlayerRankingInput,
} from './services/RankingCalculator';

// Errors
export {
  RankingError,
  TournamentNotFoundError,
  PlayerNotInRankingError,
  NoCompletedDatesError,
} from './errors/RankingError';
