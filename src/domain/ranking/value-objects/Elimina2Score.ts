/**
 * Value Object that encapsulates the ELIMINA N scoring calculation.
 *
 * ELIMINA N System:
 * - A tournament has configurable number of game dates (10-15, default 12)
 * - The N worst results are eliminated (2-3, default 2)
 * - This system rewards consistency while allowing for N bad days
 *
 * Elimina values are always computed (for display in purple before threshold).
 * They are only applied to finalScore after >= ceil(totalDates/2) dates.
 */
export class Elimina2Score {
  private constructor(
    private readonly _totalPoints: number,
    private readonly _finalScore: number,
    private readonly _elimina1: number | null,
    private readonly _elimina2: number | null,
    private readonly _elimina3: number | null,
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

    if (completedDates === 0) {
      return new Elimina2Score(0, 0, null, null, null, [], false);
    }

    // Always compute the N worst scores for display purposes
    const sortedScores = [...scores].sort((a, b) => a - b);
    const eliminatedScores = sortedScores.slice(0, datesToEliminate);
    const eliminatedSum = eliminatedScores.reduce((sum, s) => sum + s, 0);

    const elimina1 = eliminatedScores[0] ?? null;
    const elimina2 = eliminatedScores[1] ?? null;
    const elimina3 = eliminatedScores[2] ?? null;

    // Apply elimination threshold: only active after ceil(totalDates/2) dates
    const threshold = Math.ceil(totalDates / 2);
    const isApplied = completedDates >= threshold;

    // finalScore only deducts eliminated scores after threshold
    const finalScore = isApplied ? totalPoints - eliminatedSum : totalPoints;

    return new Elimina2Score(totalPoints, finalScore, elimina1, elimina2, elimina3, eliminatedScores, isApplied);
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
    return new Elimina2Score(totalPoints, finalScore, elimina1, elimina2, null, scores, isApplied);
  }

  get totalPoints(): number {
    return this._totalPoints;
  }

  get finalScore(): number {
    return this._finalScore;
  }

  get elimina1(): number | null {
    return this._elimina1;
  }

  get elimina2(): number | null {
    return this._elimina2;
  }

  get elimina3(): number | null {
    return this._elimina3;
  }

  get isApplied(): boolean {
    return this._isApplied;
  }

  get eliminatedPoints(): number {
    if (!this._isApplied) return 0;
    return this._eliminatedScores.reduce((sum, s) => sum + s, 0);
  }

  get eliminatedScores(): number[] {
    return [...this._eliminatedScores];
  }

  /** Always = totalPoints − sum(worst N), regardless of threshold. Used for FIN display. */
  get projectedScore(): number {
    const sum = this._eliminatedScores.reduce((s, v) => s + v, 0);
    return this._totalPoints - sum;
  }

  get rankingScore(): number {
    return this._finalScore;
  }

  compareTo(other: Elimina2Score): number {
    if (this.rankingScore !== other.rankingScore) {
      return other.rankingScore - this.rankingScore;
    }
    return other.totalPoints - this.totalPoints;
  }

  equals(other: Elimina2Score): boolean {
    return (
      this._totalPoints === other._totalPoints &&
      this._finalScore === other._finalScore &&
      this._elimina1 === other._elimina1 &&
      this._elimina2 === other._elimina2 &&
      this._elimina3 === other._elimina3 &&
      this._eliminatedScores.length === other._eliminatedScores.length &&
      this._eliminatedScores.every((s, i) => s === other._eliminatedScores[i])
    );
  }
}
