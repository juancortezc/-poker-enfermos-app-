import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  SCORING_RULES,
  POSITION_RANGES,
} from '@/lib/constants/scoring';

/**
 * Value Object that represents points earned for an elimination position.
 *
 * ELIMINA 2 Scoring System:
 * - Last place: 1 point
 * - Positions 10+ to second-last: +1 point each
 * - Position 9: +2 points (bonus)
 * - Positions 8-4: +1 point each
 * - Positions 3, 2, 1 (podium): +3 points each
 *
 * Immutable and calculated from position.
 */
export class Points {
  private constructor(private readonly _value: number) {}

  /**
   * Calculates points for a given position and total players.
   * Uses the ELIMINA 2 scoring system.
   */
  static calculate(position: number, totalPlayers: number): Points {
    const players = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, totalPlayers));

    if (position < 1 || position > players) {
      return new Points(0);
    }

    // Build points array for this player count
    const pointsArray = Points.buildPointsArray(players);

    return new Points(pointsArray[position - 1]);
  }

  /**
   * Creates Points with a known value (for reconstitution from persistence).
   */
  static fromValue(value: number): Points {
    return new Points(value);
  }

  /**
   * Builds the complete points array for a given number of players.
   * Index 0 = position 1 (winner), Index N-1 = position N (last place)
   */
  private static buildPointsArray(totalPlayers: number): number[] {
    const pointsArray = new Array(totalPlayers);

    // Last position always 1 point
    pointsArray[totalPlayers - 1] = 1;

    // From second-last to position 10: +1 point each
    for (let i = totalPlayers - 2; i >= POSITION_RANGES.BOTTOM_START - 1; i--) {
      pointsArray[i] = pointsArray[i + 1] + SCORING_RULES.BOTTOM_INCREMENT;
    }

    // Position 9 (index 8): +2 points bonus
    if (totalPlayers >= MIN_PLAYERS) {
      pointsArray[POSITION_RANGES.BONUS_POSITION - 1] =
        pointsArray[POSITION_RANGES.BOTTOM_START - 1] + SCORING_RULES.POSITION_9_BONUS;
    }

    // Positions 8-4 (indices 7-3): +1 point each
    for (let i = 7; i >= 3; i--) {
      pointsArray[i] = pointsArray[i + 1] + SCORING_RULES.MIDDLE_INCREMENT;
    }

    // Positions 3, 2, 1 (indices 2, 1, 0): +3 points each (podium)
    for (let i = 2; i >= 0; i--) {
      pointsArray[i] = pointsArray[i + 1] + SCORING_RULES.PODIUM_INCREMENT;
    }

    return pointsArray;
  }

  /**
   * Gets the complete points distribution for a given number of players.
   * Useful for displaying points tables.
   */
  static getDistribution(totalPlayers: number): number[] {
    const players = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, totalPlayers));
    return Points.buildPointsArray(players);
  }

  get value(): number {
    return this._value;
  }

  equals(other: Points): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return `${this._value} pts`;
  }
}
