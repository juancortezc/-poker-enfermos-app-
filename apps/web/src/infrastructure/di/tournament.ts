import { container } from './Container';

// Repository
import { PrismaTournamentRepository } from '../persistence/prisma/repositories/PrismaTournamentRepository';

// Use Case Handlers
import {
  GetTournamentsHandler,
  GetActiveTournamentHandler,
} from '@/application/tournament';

// Port types
import type {
  TournamentRepository,
  GetTournamentsUseCase,
  GetActiveTournamentUseCase,
} from '@/application/tournament';

/**
 * Dependency keys for the Tournament bounded context.
 */
export const TOURNAMENT_DEPS = {
  // Repository
  TOURNAMENT_REPOSITORY: 'TournamentRepository',

  // Use Cases
  GET_TOURNAMENTS: 'GetTournamentsUseCase',
  GET_ACTIVE_TOURNAMENT: 'GetActiveTournamentUseCase',
} as const;

/**
 * Registers all dependencies for the Tournament bounded context.
 */
export function registerTournamentDependencies(): void {
  // Register repository
  container.register<TournamentRepository>(
    TOURNAMENT_DEPS.TOURNAMENT_REPOSITORY,
    () => new PrismaTournamentRepository()
  );

  // Register use cases
  container.register<GetTournamentsUseCase>(
    TOURNAMENT_DEPS.GET_TOURNAMENTS,
    () =>
      new GetTournamentsHandler(
        container.resolve(TOURNAMENT_DEPS.TOURNAMENT_REPOSITORY)
      )
  );

  container.register<GetActiveTournamentUseCase>(
    TOURNAMENT_DEPS.GET_ACTIVE_TOURNAMENT,
    () =>
      new GetActiveTournamentHandler(
        container.resolve(TOURNAMENT_DEPS.TOURNAMENT_REPOSITORY)
      )
  );
}

/**
 * Helper functions to get typed use cases.
 */
export function getGetTournamentsUseCase(): GetTournamentsUseCase {
  return container.resolve(TOURNAMENT_DEPS.GET_TOURNAMENTS);
}

export function getGetActiveTournamentUseCase(): GetActiveTournamentUseCase {
  return container.resolve(TOURNAMENT_DEPS.GET_ACTIVE_TOURNAMENT);
}
