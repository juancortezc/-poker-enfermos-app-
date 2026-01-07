import { container } from './Container';

// Repositories
import { PrismaEliminationRepository } from '../persistence/prisma/repositories/PrismaEliminationRepository';
import { PrismaGameDateRepository } from '../persistence/prisma/repositories/PrismaGameDateRepository';
import { PrismaPlayerRepository } from '../persistence/prisma/repositories/PrismaPlayerRepository';

// Services
import { NotificationServiceAdapter } from '../services/NotificationServiceAdapter';
import { ParentChildStatsAdapter } from '../services/ParentChildStatsAdapter';

// Use Case Handlers
import {
  RegisterEliminationHandler,
  GetEliminationsHandler,
  UpdateEliminationHandler,
  DeleteEliminationHandler,
} from '@/application/elimination';

// Port types
import type {
  EliminationRepository,
  GameDateRepository,
  PlayerRepository,
  NotificationService,
  ParentChildStatsService,
  RegisterEliminationUseCase,
  GetEliminationsUseCase,
  UpdateEliminationUseCase,
  DeleteEliminationUseCase,
} from '@/application/elimination';

/**
 * Dependency keys for the Elimination bounded context.
 */
export const ELIMINATION_DEPS = {
  // Repositories
  ELIMINATION_REPOSITORY: 'EliminationRepository',
  GAME_DATE_REPOSITORY: 'GameDateRepository',
  PLAYER_REPOSITORY: 'PlayerRepository',

  // Services
  NOTIFICATION_SERVICE: 'NotificationService',
  PARENT_CHILD_STATS_SERVICE: 'ParentChildStatsService',

  // Use Cases
  REGISTER_ELIMINATION: 'RegisterEliminationUseCase',
  GET_ELIMINATIONS: 'GetEliminationsUseCase',
  UPDATE_ELIMINATION: 'UpdateEliminationUseCase',
  DELETE_ELIMINATION: 'DeleteEliminationUseCase',
} as const;

/**
 * Registers all dependencies for the Elimination bounded context.
 * Call this once at application startup.
 */
export function registerEliminationDependencies(): void {
  // Register repositories
  container.register<EliminationRepository>(
    ELIMINATION_DEPS.ELIMINATION_REPOSITORY,
    () => new PrismaEliminationRepository()
  );

  container.register<GameDateRepository>(
    ELIMINATION_DEPS.GAME_DATE_REPOSITORY,
    () => new PrismaGameDateRepository()
  );

  container.register<PlayerRepository>(
    ELIMINATION_DEPS.PLAYER_REPOSITORY,
    () => new PrismaPlayerRepository()
  );

  // Register services
  container.register<NotificationService>(
    ELIMINATION_DEPS.NOTIFICATION_SERVICE,
    () => new NotificationServiceAdapter()
  );

  container.register<ParentChildStatsService>(
    ELIMINATION_DEPS.PARENT_CHILD_STATS_SERVICE,
    () => new ParentChildStatsAdapter()
  );

  // Register use cases
  container.register<RegisterEliminationUseCase>(
    ELIMINATION_DEPS.REGISTER_ELIMINATION,
    () =>
      new RegisterEliminationHandler(
        container.resolve(ELIMINATION_DEPS.ELIMINATION_REPOSITORY),
        container.resolve(ELIMINATION_DEPS.GAME_DATE_REPOSITORY),
        container.resolve(ELIMINATION_DEPS.PLAYER_REPOSITORY),
        container.resolve(ELIMINATION_DEPS.NOTIFICATION_SERVICE),
        container.resolve(ELIMINATION_DEPS.PARENT_CHILD_STATS_SERVICE)
      )
  );

  container.register<GetEliminationsUseCase>(
    ELIMINATION_DEPS.GET_ELIMINATIONS,
    () =>
      new GetEliminationsHandler(
        container.resolve(ELIMINATION_DEPS.ELIMINATION_REPOSITORY),
        container.resolve(ELIMINATION_DEPS.PLAYER_REPOSITORY)
      )
  );

  container.register<UpdateEliminationUseCase>(
    ELIMINATION_DEPS.UPDATE_ELIMINATION,
    () =>
      new UpdateEliminationHandler(
        container.resolve(ELIMINATION_DEPS.ELIMINATION_REPOSITORY),
        container.resolve(ELIMINATION_DEPS.GAME_DATE_REPOSITORY),
        container.resolve(ELIMINATION_DEPS.PLAYER_REPOSITORY)
      )
  );

  container.register<DeleteEliminationUseCase>(
    ELIMINATION_DEPS.DELETE_ELIMINATION,
    () =>
      new DeleteEliminationHandler(
        container.resolve(ELIMINATION_DEPS.ELIMINATION_REPOSITORY),
        container.resolve(ELIMINATION_DEPS.GAME_DATE_REPOSITORY)
      )
  );
}

/**
 * Helper functions to get typed use cases.
 */
export function getRegisterEliminationUseCase(): RegisterEliminationUseCase {
  return container.resolve(ELIMINATION_DEPS.REGISTER_ELIMINATION);
}

export function getGetEliminationsUseCase(): GetEliminationsUseCase {
  return container.resolve(ELIMINATION_DEPS.GET_ELIMINATIONS);
}

export function getUpdateEliminationUseCase(): UpdateEliminationUseCase {
  return container.resolve(ELIMINATION_DEPS.UPDATE_ELIMINATION);
}

export function getDeleteEliminationUseCase(): DeleteEliminationUseCase {
  return container.resolve(ELIMINATION_DEPS.DELETE_ELIMINATION);
}
