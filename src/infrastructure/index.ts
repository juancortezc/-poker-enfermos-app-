/**
 * Infrastructure Layer
 *
 * Contains all implementations of output ports (adapters):
 * - Persistence (Prisma repositories)
 * - Services (notifications, stats)
 * - Dependency Injection container
 */

// DI Container
export { container } from './di/Container';

// Elimination context dependencies
export {
  registerEliminationDependencies,
  getRegisterEliminationUseCase,
  getGetEliminationsUseCase,
  getUpdateEliminationUseCase,
  getDeleteEliminationUseCase,
  ELIMINATION_DEPS,
} from './di/elimination';

// Ranking context dependencies
export {
  registerRankingDependencies,
  getGetTournamentRankingUseCase,
  getGetPlayerRankingUseCase,
  RANKING_DEPS,
} from './di/ranking';

// Repositories (for direct access if needed)
export { PrismaEliminationRepository } from './persistence/prisma/repositories/PrismaEliminationRepository';
export { PrismaGameDateRepository } from './persistence/prisma/repositories/PrismaGameDateRepository';
export { PrismaPlayerRepository } from './persistence/prisma/repositories/PrismaPlayerRepository';
export { PrismaTournamentRankingRepository } from './persistence/prisma/repositories/PrismaTournamentRankingRepository';

// Services
export { NotificationServiceAdapter } from './services/NotificationServiceAdapter';
export { ParentChildStatsAdapter } from './services/ParentChildStatsAdapter';

// Mappers
export { EliminationMapper } from './persistence/prisma/mappers/EliminationMapper';
