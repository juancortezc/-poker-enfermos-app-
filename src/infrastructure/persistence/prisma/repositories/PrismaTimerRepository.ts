import { prisma } from '@/lib/prisma';
import type { TimerRepository } from '@/application/timer';
import { TimerState, type TimerStatus, type RawTimerState } from '@/domain/timer';

/**
 * Prisma implementation of TimerRepository.
 */
export class PrismaTimerRepository implements TimerRepository {
  async findByGameDateId(gameDateId: number): Promise<TimerState | null> {
    const timer = await prisma.timerState.findFirst({
      where: { gameDateId },
    });

    return timer ? this.toDomain(timer) : null;
  }

  async update(
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
  ): Promise<TimerState> {
    const updated = await prisma.timerState.update({
      where: { id: timerId },
      data,
    });

    return this.toDomain(updated);
  }

  private toDomain(data: {
    id: number;
    status: string;
    currentLevel: number;
    timeRemaining: number;
    totalElapsed: number;
    startTime: Date | null;
    levelStartTime: Date | null;
    pausedAt: Date | null;
  }): TimerState {
    const raw: RawTimerState = {
      id: data.id,
      status: data.status as TimerStatus,
      currentLevel: data.currentLevel,
      timeRemaining: data.timeRemaining,
      totalElapsed: data.totalElapsed,
      startTime: data.startTime,
      levelStartTime: data.levelStartTime,
      pausedAt: data.pausedAt,
    };

    return TimerState.create(raw);
  }
}
