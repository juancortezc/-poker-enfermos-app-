import type { TimerRepository } from '../ports/output/TimerRepository';
import type {
  GetTimerStateUseCase,
  GetTimerStateQuery,
  TimerStateDTO,
} from '../ports/input/GetTimerStateUseCase';
import { TimeDisplay } from '@/domain/timer';

/**
 * Handler for getting computed timer state.
 */
export class GetTimerStateHandler implements GetTimerStateUseCase {
  constructor(private readonly repository: TimerRepository) {}

  async execute(query: GetTimerStateQuery): Promise<TimerStateDTO | null> {
    const timer = await this.repository.findByGameDateId(query.gameDateId);

    if (!timer) {
      return null;
    }

    const computed = timer.compute();

    return {
      ...computed,
      formattedTimeRemaining: TimeDisplay.fromSeconds(
        computed.timeRemaining
      ).toTimerDisplay(),
      formattedTotalElapsed: TimeDisplay.fromSeconds(
        computed.totalElapsed
      ).toTimerDisplay(),
    };
  }
}
