/**
 * Value object for time display formatting.
 */
export class TimeDisplay {
  private constructor(private readonly _seconds: number) {}

  static fromSeconds(seconds: number): TimeDisplay {
    return new TimeDisplay(Math.max(0, seconds));
  }

  get seconds(): number {
    return this._seconds;
  }

  get minutes(): number {
    return Math.floor(this._seconds / 60);
  }

  get hours(): number {
    return Math.floor(this._seconds / 3600);
  }

  /**
   * Format as MM:SS
   */
  toMinutesSeconds(): string {
    const mins = Math.floor(this._seconds / 60);
    const secs = this._seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format with hours if needed (H:MM:SS or MM:SS)
   */
  toTimerDisplay(): string {
    const hours = Math.floor(this._seconds / 3600);
    const mins = Math.floor((this._seconds % 3600) / 60);
    const secs = this._seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
