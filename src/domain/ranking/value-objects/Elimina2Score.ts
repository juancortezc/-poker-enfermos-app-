/**
 * Value Object that encapsulates the ELIMINA N scoring calculation.
 *
 * ELIMINA N System:
 * - A tournament has configurable number of game dates (10-15, default 12)
 * - The N worst results are eliminated (2-3, default 2)
 * - This system rewards consistency while allowing for N bad days
 *
 * The elimination is only applied after >= ceil(totalDates/2) dates are completed.
 */
export class Elimina2Score {
  private constructor(
    private readonly _totalPoints: number,
    private readonly _finalScore: number,
    private readonly _elimina1: number | null,
    private readonly _elimina2: number | null,
    private readonly _eliminatedScores: number[],
    private readonly _isApplied: boolean
  ) {}

  /**
   * Calculates the ELIMINA N score from a list of points per date.
   *
   * @param pointsByDate - Map of dateNumber -> points (0 for absences)
   * @param datesToEliminate - Number of worst dates to eliminate (default 2)
   * @param totalDates - Total dates in tournament for threshold calculation (default 12)
   */
  static calculate(
    pointsByDate: Map<number, number>,
    datesToEliminate: number = 2,
    totalDates: number = 12
  ): Elimina2Score {
    const scores = Array.from(pointsByDate.values());
    const totalPoints = scores.reduce((sum, pts) => sum + pts, 0);
    const completedDates = scores.length;

    // Apply elimination when >= ceil(totalDates/2) dates are completed
    const threshold = Math.ceil(totalDates / 2);
    const shouldApply = completedDates >= threshold;

    if (!shouldApply) {
      return new Elimina2Score(totalPoints, totalPoints, null, null, [], false);
    }

    // Sort scores ascending to find the N worst
    const sortedScores = [...scores].sort((a, b) => a - b);
    const eliminatedScores = sortedScores.slice(0, datesToEliminate);
    const eliminatedSum = eliminatedScores.reduce((sum, s) => sum + s, 0);

    // For backwards compatibility, keep elimina1 and elimina2
    const elimina1 = eliminatedScores[0] ?? null;
    const elimina2 = eliminatedScores[1] ?? null;

    // Final score = total - N worst dates
    const finalScore = totalPoints - eliminatedSum;

    return new Elimina2Score(totalPoints, finalScore, elimina1, elimina2, eliminatedScores, true);
  }

  /**
   * Creates an Elimina2Score from known values (for reconstitution).
   */
  static fromValues(
    totalPoints: number,
    finalScore: number,
    elimina1: number | null,
    elimina2: number | null,
    eliminatedScores?: number[]
  ): Elimina2Score {
    const isApplied = elimina1 !== null;
    const scores = eliminatedScores ?? (elimina1 !== null && elimina2 !== null ? [elimina1, elimina2] : []);
    return new Elimina2Score(totalPoints, finalScore, elimina1, elimina2, scores, isApplied);
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
   * Points eliminated (sum of N worst dates).
   */
  get eliminatedPoints(): number {
    if (!this._isApplied) return 0;
    return this._eliminatedScores.reduce((sum, s) => sum + s, 0);
  }

  /**
   * All eliminated scores (for N > 2 scenarios).
   */
  get eliminatedScores(): number[] {
    return [...this._eliminatedScores];
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
      this._elimina2 === other._elimina2 &&
      this._eliminatedScores.length === other._eliminatedScores.length &&
      this._eliminatedScores.every((s, i) => s === other._eliminatedScores[i])
    );
  }
}
