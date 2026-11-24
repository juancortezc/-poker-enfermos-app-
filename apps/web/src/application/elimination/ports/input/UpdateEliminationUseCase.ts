import { EliminationDTO } from './GetEliminationsUseCase';

/**
 * Command for updating an elimination.
 * Only player assignments can be changed, not position or points.
 */
export interface UpdateEliminationCommand {
  eliminationId: number;
  eliminatedPlayerId?: string;
  eliminatorPlayerId?: string | null;
}

/**
 * Input port for updating an elimination.
 *
 * Business Rules:
 * 1. Game date must be in_progress
 * 2. Cannot change position or points
 * 3. New eliminated player cannot already be eliminated
 * 4. New eliminator cannot have been eliminated before this position
 */
export interface UpdateEliminationUseCase {
  execute(command: UpdateEliminationCommand): Promise<EliminationDTO>;
}
