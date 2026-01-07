import { prisma } from '@/lib/prisma';
import { GameDateRepository, GameDateInfo } from '@/application/elimination';

/**
 * Prisma implementation of the GameDateRepository port.
 * Provides minimal game date info needed by the Elimination context.
 */
export class PrismaGameDateRepository implements GameDateRepository {
  async findById(id: number): Promise<GameDateInfo | null> {
    const gameDate = await prisma.gameDate.findUnique({
      where: { id },
      include: {
        tournament: {
          select: { id: true },
        },
      },
    });

    if (!gameDate) return null;

    return {
      id: gameDate.id,
      tournamentId: gameDate.tournament.id,
      status: gameDate.status as GameDateInfo['status'],
      playerIds: gameDate.playerIds,
      scheduledDate: gameDate.scheduledDate,
    };
  }

  async markAsCompleted(id: number): Promise<void> {
    await prisma.gameDate.update({
      where: { id },
      data: { status: 'completed' },
    });
  }
}
