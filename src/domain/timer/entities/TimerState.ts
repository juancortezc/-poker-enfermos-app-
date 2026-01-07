/**
 * Timer status enum.
 */
export type TimerStatus = 'idle' | 'active' | 'paused' | 'completed';

/**
 * Computed timer state with calculated values.
 */
export interface ComputedTimerState {
  id: number;
  status: TimerStatus;
  currentLevel: number;
  timeRemaining: number;
  elapsedInLevel: number;
  totalElapsed: number;
  startTime: Date | null;
  levelStartTime: Date | null;
}

/**
 * Raw timer state from persistence.
 */
export interface RawTimerState {
  id: number;
  status: TimerStatus;
  currentLevel: number;
  timeRemaining: number;
  totalElapsed: number;
  startTime: Date | null;
  levelStartTime: Date | null;
  pausedAt: Date | null;
}

/**
 * TimerState Entity - Manages poker blind timer state.
 */
export class TimerState {
  private constructor(
    private readonly _id: number,
    private readonly _status: TimerStatus,
    private readonly _currentLevel: number,
    private readonly _timeRemaining: number,
    private readonly _totalElapsed: number,
    private readonly _startTime: Date | null,
    private readonly _levelStartTime: Date | null,
    private readonly _pausedAt: Date | null
  ) {}

  static create(raw: RawTimerState): TimerState {
    return new TimerState(
      raw.id,
      raw.status,
      raw.currentLevel,
      raw.timeRemaining,
      raw.totalElapsed,
      raw.startTime,
      raw.levelStartTime,
      raw.pausedAt
    );
  }

  get id(): number {
    return this._id;
  }

  get status(): TimerStatus {
    return this._status;
  }

  get currentLevel(): number {
    return this._currentLevel;
  }

  get timeRemaining(): number {
    return this._timeRemaining;
  }

  get totalElapsed(): number {
    return this._totalElapsed;
  }

  get startTime(): Date | null {
    return this._startTime;
  }

  get levelStartTime(): Date | null {
    return this._levelStartTime;
  }

  get pausedAt(): Date | null {
    return this._pausedAt;
  }

  isActive(): boolean {
    return this._status === 'active';
  }

  isPaused(): boolean {
    return this._status === 'paused';
  }

  isIdle(): boolean {
    return this._status === 'idle';
  }

  isCompleted(): boolean {
    return this._status === 'completed';
  }

  /**
   * Compute current timer state with real-time calculations.
   */
  compute(now?: number): ComputedTimerState {
    const reference = now ?? Date.now();
    let timeRemaining = this._timeRemaining;
    let elapsedInLevel = 0;

    if (this._status === 'active' && this._levelStartTime) {
      const elapsedSinceLevelStart = Math.max(
        0,
        Math.floor((reference - this._levelStartTime.getTime()) / 1000)
      );
      timeRemaining = Math.max(0, this._timeRemaining - elapsedSinceLevelStart);
      elapsedInLevel = Math.min(this._timeRemaining, elapsedSinceLevelStart);
    }

    const totalElapsed = this._startTime
      ? Math.max(
          this._totalElapsed,
          Math.floor((reference - this._startTime.getTime()) / 1000)
        )
      : this._totalElapsed;

    return {
      id: this._id,
      status: this._status,
      currentLevel: this._currentLevel,
      timeRemaining,
      elapsedInLevel,
      totalElapsed,
      startTime: this._startTime,
      levelStartTime: this._levelStartTime,
    };
  }

  /**
   * Derive pause update data.
   */
  derivePauseUpdate(now?: number): {
    status: TimerStatus;
    timeRemaining: number;
    totalElapsed: number;
    pausedAt: Date;
    lastUpdated: Date;
  } {
    const reference = now ?? Date.now();
    const computed = this.compute(reference);

    return {
      status: 'paused',
      timeRemaining: computed.timeRemaining,
      totalElapsed: computed.totalElapsed,
      pausedAt: new Date(reference),
      lastUpdated: new Date(reference),
    };
  }

  /**
   * Derive resume update data.
   */
  deriveResumeUpdate(now?: number): {
    status: TimerStatus;
    timeRemaining: number;
    levelStartTime: Date;
    pausedAt: null;
    lastUpdated: Date;
  } {
    const reference = now ?? Date.now();
    const computed = this.compute(reference);

    return {
      status: 'active',
      timeRemaining: computed.timeRemaining,
      levelStartTime: new Date(reference),
      pausedAt: null,
      lastUpdated: new Date(reference),
    };
  }

  /**
   * Derive level change update data.
   */
  deriveLevelChangeUpdate(
    newLevel: number,
    newDurationSeconds: number,
    now?: number
  ): {
    currentLevel: number;
    timeRemaining: number;
    totalElapsed: number;
    levelStartTime: Date;
    lastUpdated: Date;
  } {
    const reference = now ?? Date.now();
    const computed = this.compute(reference);

    return {
      currentLevel: newLevel,
      timeRemaining: newDurationSeconds,
      totalElapsed: computed.totalElapsed,
      levelStartTime: new Date(reference),
      lastUpdated: new Date(reference),
    };
  }
}
