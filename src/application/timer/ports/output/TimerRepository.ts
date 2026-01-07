import type { TimerState } from '@/domain/timer';

/**
 * Output port for timer state persistence.
 */
export interface TimerRepository {
  /**
   * Find timer state for a game date.
   */
  findByGameDateId(gameDateId: number): Promise<TimerState | null>;

  /**
   * Update timer state.
   */
  update(
    timerId: number,
    data: Partial<{
      status: string;
      currentLevel: number;
      timeRemaining: number;
      totalElapsed: number;
      startTime: Date | null;
      levelStartTime: Date | null;
      pausedAt: Date | null;
      lastUpdated: Date;
    }>
  ): Promise<TimerState>;
}
