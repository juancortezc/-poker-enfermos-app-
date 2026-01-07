import { container } from './Container';

// Repository
import { PrismaPlayerQueryRepository } from '../persistence/prisma/repositories/PrismaPlayerQueryRepository';

// Use Case Handlers
import { GetPlayersHandler } from '@/application/player';

// Port types
import type { PlayerRepository, GetPlayersUseCase } from '@/application/player';

/**
 * Dependency keys for the Player bounded context.
 */
export const PLAYER_DEPS = {
  // Repository
  PLAYER_REPOSITORY: 'PlayerRepository',

  // Use Cases
  GET_PLAYERS: 'GetPlayersUseCase',
} as const;

/**
 * Registers all dependencies for the Player bounded context.
 */
export function registerPlayerDependencies(): void {
  // Register repository
  container.register<PlayerRepository>(
    PLAYER_DEPS.PLAYER_REPOSITORY,
    () => new PrismaPlayerQueryRepository()
  );

  // Register use cases
  container.register<GetPlayersUseCase>(PLAYER_DEPS.GET_PLAYERS, () =>
    new GetPlayersHandler(container.resolve(PLAYER_DEPS.PLAYER_REPOSITORY))
  );
}

/**
 * Helper function to get typed use case.
 */
export function getGetPlayersUseCase(): GetPlayersUseCase {
  return container.resolve(PLAYER_DEPS.GET_PLAYERS);
}
