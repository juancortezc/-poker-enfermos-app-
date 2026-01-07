/**
 * Value Object representing a player's ranking trend.
 *
 * Shows how a player's position changed compared to the previous game date.
 */
export class RankingTrend {
  private constructor(
    private readonly _direction: 'up' | 'down' | 'same',
    private readonly _positionsChanged: number
  ) {}

  /**
   * Creates a trend based on position change.
   *
   * @param previousPosition - Position in previous ranking (null if new player)
   * @param currentPosition - Current position in ranking
   */
  static calculate(
    previousPosition: number | null,
    currentPosition: number
  ): RankingTrend {
    if (previousPosition === null) {
      return new RankingTrend('same', 0);
    }

    const positionDiff = previousPosition - currentPosition;

    if (positionDiff > 0) {
      // Position number decreased = moved up in ranking
      return new RankingTrend('up', positionDiff);
    } else if (positionDiff < 0) {
      // Position number increased = moved down in ranking
      return new RankingTrend('down', positionDiff);
    } else {
      return new RankingTrend('same', 0);
    }
  }

  /**
   * Creates a neutral trend (no change).
   */
  static same(): RankingTrend {
    return new RankingTrend('same', 0);
  }

  /**
   * Creates a trend from known values (for reconstitution).
   */
  static fromValues(
    direction: 'up' | 'down' | 'same',
    positionsChanged: number
  ): RankingTrend {
    return new RankingTrend(direction, positionsChanged);
  }

  get direction(): 'up' | 'down' | 'same' {
    return this._direction;
  }

  get positionsChanged(): number {
    return this._positionsChanged;
  }

  /**
   * Absolute value of positions changed.
   */
  get absoluteChange(): number {
    return Math.abs(this._positionsChanged);
  }

  isUp(): boolean {
    return this._direction === 'up';
  }

  isDown(): boolean {
    return this._direction === 'down';
  }

  isSame(): boolean {
    return this._direction === 'same';
  }

  equals(other: RankingTrend): boolean {
    return (
      this._direction === other._direction &&
      this._positionsChanged === other._positionsChanged
    );
  }
}
