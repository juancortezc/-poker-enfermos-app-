import { Elimination } from '@/domain/elimination';

/**
 * Output port for Elimination persistence.
 *
 * This interface defines what the application layer needs from persistence,
 * without knowing HOW it's implemented (Prisma, in-memory, etc.)
 */
export interface EliminationRepository {
  /**
   * Saves a new elimination and returns it with the generated ID.
   */
  save(elimination: Elimination): Promise<Elimination>;

  /**
   * Finds an elimination by ID, returns null if not found.
   */
  findById(id: number): Promise<Elimination | null>;

  /**
   * Gets all eliminations for a game date, ordered by position descending.
   */
  findByGameDateId(gameDateId: number): Promise<Elimination[]>;

  /**
   * Checks if a player has already been eliminated in a game date.
   */
  existsByPlayerInGameDate(playerId: string, gameDateId: number): Promise<boolean>;

  /**
   * Checks if a position is already taken in a game date.
   */
  existsByPositionInGameDate(position: number, gameDateId: number): Promise<boolean>;

  /**
   * Gets the elimination for a specific player in a game date (if exists).
   * Used to check if an eliminator was already eliminated.
   */
  findByPlayerInGameDate(playerId: string, gameDateId: number): Promise<Elimination | null>;

  /**
   * Counts eliminations in a game date.
   */
  countByGameDateId(gameDateId: number): Promise<number>;

  /**
   * Updates an existing elimination.
   */
  update(elimination: Elimination): Promise<Elimination>;

  /**
   * Deletes an elimination by ID.
   */
  delete(id: number): Promise<void>;

  /**
   * Checks if there are eliminations with lower position numbers (happened after).
   * Used to validate deletion - can only delete the most recent elimination.
   */
  existsLaterEliminations(gameDateId: number, position: number): Promise<boolean>;
}
