/**
 * Command for deleting an elimination.
 */
export interface DeleteEliminationCommand {
  eliminationId: number;
}

/**
 * Input port for deleting an elimination.
 *
 * Business Rules:
 * 1. Game date must be in_progress
 * 2. Can only delete the most recent elimination (no later eliminations exist)
 */
export interface DeleteEliminationUseCase {
  execute(command: DeleteEliminationCommand): Promise<void>;
}
