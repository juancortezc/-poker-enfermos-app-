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
      },
    });

    return player;
  }

  async updateLastVictoryDate(playerId: string, victoryDate: string): Promise<void> {
    await prisma.player.update({
      where: { id: playerId },
      data: { lastVictoryDate: victoryDate },
    });
  }
}
