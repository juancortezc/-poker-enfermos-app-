/**
 * Tournament status enum.
 */
export type TournamentStatus = 'ACTIVO' | 'COMPLETADO' | 'CANCELLED';

/**
 * Game date status enum.
 */
export type GameDateStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Blind level configuration.
 */
export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  duration: number; // in minutes
}

/**
 * Game date within a tournament.
 */
export interface GameDateInfo {
  id: number;
  dateNumber: number;
  scheduledDate: Date;
  status: GameDateStatus;
  playerIds: string[];
  guestIds: string[];
  location?: string;
}

/**
 * Tournament participant.
 */
export interface TournamentParticipant {
  playerId: string;
  playerName: string;
  confirmed: boolean;
  joinedAt: Date;
}

/**
 * Tournament Entity - Aggregate Root for the Tournament bounded context.
 */
export class Tournament {
  private constructor(
    private readonly _id: number,
    private readonly _name: string,
    private readonly _number: number,
    private _status: TournamentStatus,
    private readonly _gameDates: GameDateInfo[],
    private readonly _participants: TournamentParticipant[],
    private readonly _blindLevels: BlindLevel[],
    private readonly _createdAt: Date
  ) {}

  static create(props: {
    id: number;
    name: string;
    number: number;
    status: TournamentStatus;
    gameDates: GameDateInfo[];
    participants: TournamentParticipant[];
    blindLevels: BlindLevel[];
    createdAt: Date;
  }): Tournament {
    return new Tournament(
      props.id,
      props.name,
      props.number,
      props.status,
      props.gameDates,
      props.participants,
      props.blindLevels,
      props.createdAt
    );
  }

  get id(): number {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get number(): number {
    return this._number;
  }

  get status(): TournamentStatus {
    return this._status;
  }

  get gameDates(): readonly GameDateInfo[] {
    return this._gameDates;
  }

  get participants(): readonly TournamentParticipant[] {
    return this._participants;
  }

  get blindLevels(): readonly BlindLevel[] {
    return this._blindLevels;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get totalDates(): number {
    return this._gameDates.length;
  }

  get completedDates(): number {
    return this._gameDates.filter((d) => d.status === 'completed').length;
  }

  get participantCount(): number {
    return this._participants.length;
  }

  isActive(): boolean {
    return this._status === 'ACTIVO';
  }

  isCompleted(): boolean {
    return this._status === 'COMPLETADO';
  }

  getNextGameDate(): GameDateInfo | undefined {
    return this._gameDates.find((d) => d.status === 'scheduled');
  }

  getGameDateInProgress(): GameDateInfo | undefined {
    return this._gameDates.find((d) => d.status === 'in_progress');
  }
}
