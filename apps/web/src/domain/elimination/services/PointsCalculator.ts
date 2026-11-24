import { Points } from '../value-objects/Points';
import { MIN_PLAYERS, MAX_PLAYERS } from '@/lib/constants/scoring';

/**
 * Domain Service for points calculation.
 *
 * Provides utility methods for working with the ELIMINA 2 scoring system.
 * Delegates actual calculation to the Points value object.
 */
export class PointsCalculator {
  /**
   * Calculate points for a specific position.
   */
  static calculateForPosition(position: number, totalPlayers: number): number {
    return Points.calculate(position, totalPlayers).value;
  }

  /**
   * Get points for the winner (position 1).
   */
  static getWinnerPoints(totalPlayers: number): number {
    return Points.calculate(1, totalPlayers).value;
  }

  /**
   * Get the complete points distribution for a game date.
   * Returns array where index 0 = position 1 points, etc.
   */
  static getDistribution(totalPlayers: number): number[] {
    return Points.getDistribution(totalPlayers);
  }

  /**
   * Get the complete points table for all supported player counts.
   * Useful for administration displays.
   */
  static getPointsTable(): Record<number, number[]> {
    const table: Record<number, number[]> = {};

    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      table[players] = Points.getDistribution(players);
    }

    return table;
  }

  /**
   * Validate that a player count is within supported range.
   */
  static isValidPlayerCount(count: number): boolean {
    return count >= MIN_PLAYERS && count <= MAX_PLAYERS;
  }

  /**
   * Get the supported player count range.
   */
  static getPlayerCountRange(): { min: number; max: number } {
    return { min: MIN_PLAYERS, max: MAX_PLAYERS };
  }
}
