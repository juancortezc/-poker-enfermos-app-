import { prisma } from '@/lib/prisma';
import { PlayerRepository, PlayerInfo } from '@/application/elimination';

/**
 * Prisma implementation of the PlayerRepository port.
 * Provides minimal player info needed by the Elimination context.
 */
export class PrismaPlayerRepository implements PlayerRepository {
  async findById(id: string): Promise<PlayerInfo | null> {
    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
      },
    });

    return player;
  }

  async findByIds(ids: string[]): Promise<PlayerInfo[]> {
    if (ids.length === 0) return [];

    return prisma.player.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
      },
    });
  }

  async updateLastVictoryDate(playerId: string, victoryDate: string): Promise<void> {
    await prisma.player.update({
      where: { id: playerId },
      data: { lastVictoryDate: victoryDate },
    });
  }
}
