import { RANKING_CONFIG } from '@/lib/constants/scoring';

/**
 * Value Object that encapsulates the ELIMINA 2 scoring calculation.
 *
 * ELIMINA 2 System:
 * - A tournament has 12 game dates
 * - Only the best 10 dates count for the championship
 * - The 2 worst results are eliminated (including absences = 0 points)
 * - This system rewards consistency while allowing for 2 bad days
 *
 * The elimination is only applied after 6+ dates are completed.
 */
export class Elimina2Score {
  private constructor(
    private readonly _totalPoints: number,
    private readonly _finalScore: number,
    private readonly _elimina1: number | null,
    private readonly _elimina2: number | null,
    private readonly _isApplied: boolean
  ) {}

  /**
   * Calculates the ELIMINA 2 score from a list of points per date.
   *
   * @param pointsByDate - Map of dateNumber -> points (0 for absences)
   */
  static calculate(pointsByDate: Map<number, number>): Elimina2Score {
    const scores = Array.from(pointsByDate.values());
    const totalPoints = scores.reduce((sum, pts) => sum + pts, 0);
    const completedDates = scores.length;

    // Only apply ELIMINA 2 when 6+ dates are completed
    const shouldApply = completedDates >= 6;

    if (!shouldApply) {
      return new Elimina2Score(totalPoints, totalPoints, null, null, false);
    }

    // Sort scores ascending to find the 2 worst
    const sortedScores = [...scores].sort((a, b) => a - b);
    const elimina1 = sortedScores[0]; // Worst score
    const elimina2 = sortedScores[1]; // Second worst score

    // Final score = total - 2 worst dates
    const finalScore = totalPoints - elimina1 - elimina2;

    return new Elimina2Score(totalPoints, finalScore, elimina1, elimina2, true);
  }

  /**
   * Creates an Elimina2Score from known values (for reconstitution).
   */
  static fromValues(
    totalPoints: number,
    finalScore: number,
    elimina1: number | null,
    elimina2: number | null
  ): Elimina2Score {
    const isApplied = elimina1 !== null && elimina2 !== null;
    return new Elimina2Score(totalPoints, finalScore, elimina1, elimina2, isApplied);
  }

  /**
   * Total points across all dates (before elimination).
   */
  get totalPoints(): number {
    return this._totalPoints;
  }

  /**
   * Final score after applying ELIMINA 2 (or total if not applied).
   */
  get finalScore(): number {
    return this._finalScore;
  }

  /**
   * Worst date score (eliminated), null if ELIMINA 2 not applied.
   */
  get elimina1(): number | null {
    return this._elimina1;
  }

  /**
   * Second worst date score (eliminated), null if ELIMINA 2 not applied.
   */
  get elimina2(): number | null {
    return this._elimina2;
  }

  /**
   * Whether ELIMINA 2 has been applied (requires 6+ dates).
   */
  get isApplied(): boolean {
    return this._isApplied;
  }

  /**
   * Points eliminated (sum of 2 worst dates).
   */
  get eliminatedPoints(): number {
    if (!this._isApplied) return 0;
    return (this._elimina1 ?? 0) + (this._elimina2 ?? 0);
  }

  /**
   * The score used for ranking comparisons.
   * Returns finalScore if ELIMINA 2 is applied, otherwise totalPoints.
   */
  get rankingScore(): number {
    return this._finalScore;
  }

  /**
   * Compares this score with another for ranking.
   * Higher score is better (returns negative if this is better).
   */
  compareTo(other: Elimina2Score): number {
    // Primary: final/ranking score
    if (this.rankingScore !== other.rankingScore) {
      return other.rankingScore - this.rankingScore;
    }

    // Secondary: total points (historical context)
    return other.totalPoints - this.totalPoints;
  }

  equals(other: Elimina2Score): boolean {
    return (
      this._totalPoints === other._totalPoints &&
      this._finalScore === other._finalScore &&
      this._elimina1 === other._elimina1 &&
      this._elimina2 === other._elimina2
    );
  }
}
