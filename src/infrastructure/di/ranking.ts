import { container } from './Container';

// Repository
import { PrismaTournamentRankingRepository } from '../persistence/prisma/repositories/PrismaTournamentRankingRepository';

// Use Case Handlers
import {
  GetTournamentRankingHandler,
  GetPlayerRankingHandler,
} from '@/application/ranking';

// Port types
import type {
  TournamentRankingRepository,
  GetTournamentRankingUseCase,
  GetPlayerRankingUseCase,
} from '@/application/ranking';

/**
 * Dependency keys for the Ranking bounded context.
 */
export const RANKING_DEPS = {
  // Repository
  TOURNAMENT_RANKING_REPOSITORY: 'TournamentRankingRepository',

  // Use Cases
  GET_TOURNAMENT_RANKING: 'GetTournamentRankingUseCase',
  GET_PLAYER_RANKING: 'GetPlayerRankingUseCase',
} as const;

/**
 * Registers all dependencies for the Ranking bounded context.
 */
export function registerRankingDependencies(): void {
  // Register repository
  container.register<TournamentRankingRepository>(
    RANKING_DEPS.TOURNAMENT_RANKING_REPOSITORY,
    () => new PrismaTournamentRankingRepository()
  );

  // Register use cases
  container.register<GetTournamentRankingUseCase>(
    RANKING_DEPS.GET_TOURNAMENT_RANKING,
    () =>
      new GetTournamentRankingHandler(
        container.resolve(RANKING_DEPS.TOURNAMENT_RANKING_REPOSITORY)
      )
  );

  container.register<GetPlayerRankingUseCase>(
    RANKING_DEPS.GET_PLAYER_RANKING,
    () =>
      new GetPlayerRankingHandler(
        container.resolve(RANKING_DEPS.TOURNAMENT_RANKING_REPOSITORY)
      )
  );
}

/**
 * Helper functions to get typed use cases.
 */
export function getGetTournamentRankingUseCase(): GetTournamentRankingUseCase {
  return container.resolve(RANKING_DEPS.GET_TOURNAMENT_RANKING);
}

export function getGetPlayerRankingUseCase(): GetPlayerRankingUseCase {
  return container.resolve(RANKING_DEPS.GET_PLAYER_RANKING);
}
