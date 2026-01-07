/**
 * Command for registering a new elimination.
 */
export interface RegisterEliminationCommand {
  gameDateId: number;
  position: number;
  eliminatedPlayerId: string;
  eliminatorPlayerId: string | null;
}

/**
 * Result of a successful elimination registration.
 */
export interface EliminationResult {
  id: number;
  gameDateId: number;
  position: number;
  points: number;
  eliminatedPlayer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  eliminatorPlayer: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  eliminationTime: string;
  /** True if this elimination triggered auto-completion of the game date */
  triggeredAutoComplete: boolean;
  /** The winner elimination if auto-complete was triggered */
  winnerElimination?: EliminationResult;
}

/**
 * Input port for registering a player elimination.
 *
 * Business Rules:
 * 1. Game date must be in_progress
 * 2. Player cannot be eliminated twice
 * 3. Position cannot be reused
 * 4. Eliminator cannot have been eliminated before this position
 * 5. If position 2, auto-complete with eliminator as winner
 */
export interface RegisterEliminationUseCase {
  execute(command: RegisterEliminationCommand): Promise<EliminationResult>;
}
