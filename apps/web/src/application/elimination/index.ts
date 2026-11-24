/**
 * Elimination Bounded Context - Application Layer
 *
 * This module contains the use cases (commands/queries) and ports
 * (interfaces for input and output) for the Elimination context.
 *
 * Architecture:
 * - Commands: Write operations (register, update, delete)
 * - Queries: Read operations (get eliminations)
 * - Ports/Input: Interfaces that define what operations are available
 * - Ports/Output: Interfaces for external dependencies (repositories, services)
 */

// Use Case Handlers
export { RegisterEliminationHandler } from './commands/RegisterEliminationHandler';
export { UpdateEliminationHandler } from './commands/UpdateEliminationHandler';
export { DeleteEliminationHandler } from './commands/DeleteEliminationHandler';
export { GetEliminationsHandler } from './queries/GetEliminationsHandler';

// Input Ports (Use Case Interfaces)
export type {
  RegisterEliminationUseCase,
  RegisterEliminationCommand,
  EliminationResult,
} from './ports/input/RegisterEliminationUseCase';

export type {
  GetEliminationsUseCase,
  GetEliminationsQuery,
  EliminationDTO,
} from './ports/input/GetEliminationsUseCase';

export type {
  UpdateEliminationUseCase,
  UpdateEliminationCommand,
} from './ports/input/UpdateEliminationUseCase';

export type {
  DeleteEliminationUseCase,
  DeleteEliminationCommand,
} from './ports/input/DeleteEliminationUseCase';

// Output Ports (Repository/Service Interfaces)
export type { EliminationRepository } from './ports/output/EliminationRepository';
export type { GameDateRepository, GameDateInfo } from './ports/output/GameDateRepository';
export type { PlayerRepository, PlayerInfo } from './ports/output/PlayerRepository';
export type { NotificationService } from './ports/output/NotificationService';
export type { ParentChildStatsService } from './ports/output/ParentChildStatsService';
