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

// Tournament context dependencies
export {
  registerTournamentDependencies,
  getGetTournamentsUseCase,
  getGetActiveTournamentUseCase,
  TOURNAMENT_DEPS,
} from './di/tournament';

// Player context dependencies
export {
  registerPlayerDependencies,
  getGetPlayersUseCase,
  PLAYER_DEPS,
} from './di/player';

// Timer context dependencies
export {
  registerTimerDependencies,
  getGetTimerStateUseCase,
  TIMER_DEPS,
} from './di/timer';

// Proposal context dependencies
export {
  registerProposalDependencies,
  getGetProposalsUseCase,
  PROPOSAL_DEPS,
} from './di/proposal';

// Repositories (for direct access if needed)
export { PrismaEliminationRepository } from './persistence/prisma/repositories/PrismaEliminationRepository';
export { PrismaGameDateRepository } from './persistence/prisma/repositories/PrismaGameDateRepository';
export { PrismaPlayerRepository } from './persistence/prisma/repositories/PrismaPlayerRepository';
export { PrismaTournamentRankingRepository } from './persistence/prisma/repositories/PrismaTournamentRankingRepository';
export { PrismaTournamentRepository } from './persistence/prisma/repositories/PrismaTournamentRepository';
export { PrismaPlayerQueryRepository } from './persistence/prisma/repositories/PrismaPlayerQueryRepository';
export { PrismaTimerRepository } from './persistence/prisma/repositories/PrismaTimerRepository';
export { PrismaProposalRepository } from './persistence/prisma/repositories/PrismaProposalRepository';

// Services
export { NotificationServiceAdapter } from './services/NotificationServiceAdapter';
export { ParentChildStatsAdapter } from './services/ParentChildStatsAdapter';

// Mappers
export { EliminationMapper } from './persistence/prisma/mappers/EliminationMapper';
