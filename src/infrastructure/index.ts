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

// Repositories (for direct access if needed)
export { PrismaEliminationRepository } from './persistence/prisma/repositories/PrismaEliminationRepository';
export { PrismaGameDateRepository } from './persistence/prisma/repositories/PrismaGameDateRepository';
export { PrismaPlayerRepository } from './persistence/prisma/repositories/PrismaPlayerRepository';

// Services
export { NotificationServiceAdapter } from './services/NotificationServiceAdapter';
export { ParentChildStatsAdapter } from './services/ParentChildStatsAdapter';

// Mappers
export { EliminationMapper } from './persistence/prisma/mappers/EliminationMapper';
