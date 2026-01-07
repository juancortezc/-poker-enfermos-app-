/**
 * Ranking Bounded Context - Application Layer
 *
 * Contains the use cases (queries) and ports for the Ranking context.
 * Since ranking is primarily read-only, we only have query handlers.
 */

// Query Handlers
export { GetTournamentRankingHandler } from './queries/GetTournamentRankingHandler';
export { GetPlayerRankingHandler } from './queries/GetPlayerRankingHandler';

// Input Ports (Use Case Interfaces)
export type {
  GetTournamentRankingUseCase,
  GetTournamentRankingQuery,
  TournamentRankingDTO,
  PlayerRankingDTO,
} from './ports/input/GetTournamentRankingUseCase';

export type {
  GetPlayerRankingUseCase,
  GetPlayerRankingQuery,
} from './ports/input/GetPlayerRankingUseCase';

// Output Ports (Repository Interfaces)
export type {
  TournamentRankingRepository,
  TournamentRankingData,
} from './ports/output/TournamentRankingRepository';
