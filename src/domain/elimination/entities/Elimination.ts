import { Position } from '../value-objects/Position';
import { Points } from '../value-objects/Points';

/**
 * Props for creating a new Elimination.
 */
export interface CreateEliminationProps {
  gameDateId: number;
  position: number;
  totalPlayers: number;
  eliminatedPlayerId: string;
  eliminatorPlayerId: string | null;
  eliminationTime: Date;
}

/**
 * Props for reconstituting an Elimination from persistence.
 */
export interface EliminationProps {
  id: number;
  gameDateId: number;
  position: Position;
  points: Points;
  eliminatedPlayerId: string;
  eliminatorPlayerId: string | null;
  eliminationTime: Date;
}

/**
 * Elimination Entity - Aggregate Root for the Elimination bounded context.
 *
 * Represents a player being eliminated from a game date at a specific position.
 * Encapsulates all business rules related to eliminations.
 *
 * Business Rules:
 * 1. Position must be valid for the total number of players
 * 2. Points are calculated automatically based on position
 * 3. Position 1 = Winner (self-eliminates or eliminated by subcampeón)
 * 4. An eliminator cannot have been eliminated before this position
 */
export class Elimination {
  private constructor(
    private readonly _id: number | null,
    private readonly _gameDateId: number,
    private readonly _position: Position,
    private readonly _points: Points,
    private readonly _eliminatedPlayerId: string,
    private readonly _eliminatorPlayerId: string | null,
    private readonly _eliminationTime: Date
  ) {}

  /**
   * Factory method to create a new Elimination.
   * Calculates points automatically based on position.
   */
  static create(props: CreateEliminationProps): Elimination {
    const position = Position.create(props.position, props.totalPlayers);
    const points = Points.calculate(props.position, props.totalPlayers);

    return new Elimination(
      null, // New elimination has no ID yet
      props.gameDateId,
      position,
      points,
      props.eliminatedPlayerId,
      props.eliminatorPlayerId,
      props.eliminationTime
    );
  }

  /**
   * Reconstitutes an Elimination from persistence data.
   */
  static reconstitute(props: EliminationProps): Elimination {
    return new Elimination(
      props.id,
      props.gameDateId,
      props.position,
      props.points,
      props.eliminatedPlayerId,
      props.eliminatorPlayerId,
      props.eliminationTime
    );
  }

  // Getters
  get id(): number | null {
    return this._id;
  }

  get gameDateId(): number {
    return this._gameDateId;
  }

  get position(): Position {
    return this._position;
  }

  get points(): Points {
    return this._points;
  }

  get eliminatedPlayerId(): string {
    return this._eliminatedPlayerId;
  }

  get eliminatorPlayerId(): string | null {
    return this._eliminatorPlayerId;
  }

  get eliminationTime(): Date {
    return this._eliminationTime;
  }

  /**
   * Returns true if this elimination represents the winner.
   */
  isWinner(): boolean {
    return this._position.isWinner();
  }

  /**
   * Returns true if this elimination represents the runner-up (position 2).
   * When position 2 is registered with an eliminator, that eliminator becomes the winner.
   */
  isRunnerUp(): boolean {
    return this._position.isRunnerUp();
  }

  /**
   * Returns true if this is a podium finish (positions 1, 2, or 3).
   */
  isPodium(): boolean {
    return this._position.isPodium();
  }

  /**
   * Returns the eliminator's player ID if this elimination triggers auto-completion.
   * Auto-completion happens when:
   * - Position 2 is registered
   * - There's an eliminator (the person who eliminated the runner-up)
   * That eliminator becomes the winner (position 1).
   */
  getAutoCompleteWinnerId(): string | null {
    if (this.isRunnerUp() && this._eliminatorPlayerId) {
      return this._eliminatorPlayerId;
    }
    return null;
  }

  /**
   * Creates the winner elimination for auto-completion.
   * Called when position 2 is registered and triggers auto-complete.
   */
  createWinnerElimination(winnerId: string, totalPlayers: number): Elimination {
    return Elimination.create({
      gameDateId: this._gameDateId,
      position: 1,
      totalPlayers,
      eliminatedPlayerId: winnerId,
      eliminatorPlayerId: winnerId, // Winner "eliminates" themselves
      eliminationTime: new Date(),
    });
  }
}
