import type { Player, PlayerRole } from '@/domain/player';

/**
 * Filter options for player queries.
 */
export interface PlayerFilter {
  roles?: PlayerRole[];
  search?: string;
  includeInactive?: boolean;
}

/**
 * Output port for player data access.
 */
export interface PlayerRepository {
  /**
   * Find all players matching the filter.
   */
  findAll(filter?: PlayerFilter): Promise<Player[]>;

  /**
   * Find a player by ID.
   */
  findById(id: string): Promise<Player | null>;
}
