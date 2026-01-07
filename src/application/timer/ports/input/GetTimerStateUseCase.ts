import type { TimerStatus, ComputedTimerState } from '@/domain/timer';

/**
 * Query for getting timer state.
 */
export interface GetTimerStateQuery {
  gameDateId: number;
}

/**
 * DTO for timer state response.
 */
export interface TimerStateDTO extends ComputedTimerState {
  formattedTimeRemaining: string;
  formattedTotalElapsed: string;
}

/**
 * Use case for getting computed timer state.
 */
export interface GetTimerStateUseCase {
  execute(query: GetTimerStateQuery): Promise<TimerStateDTO | null>;
}
