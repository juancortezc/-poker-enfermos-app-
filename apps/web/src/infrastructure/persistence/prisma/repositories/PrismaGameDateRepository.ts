import { db, withGameDateLock } from '@/lib/prisma-tx';
import { stopTimer } from '@/lib/timer-service';
import { GameDateRepository, GameDateInfo } from '@/application/elimination';

/**
 * Prisma implementation of the GameDateRepository port.
 * Provides minimal game date info needed by the Elimination context.
 */
export class PrismaGameDateRepository implements GameDateRepository {
  async findById(id: number): Promise<GameDateInfo | null> {
    const gameDate = await db().gameDate.findUnique({
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
    console.log(`[PrismaGameDateRepository] markAsCompleted called for id=${id}`);
    const result = await db().gameDate.update({
      where: { id },
      data: { status: 'completed' },
    });
    // Fecha cerrada = reloj detenido. Antes el timer seguia corriendo.
    await stopTimer(id, db());
    console.log(`[PrismaGameDateRepository] markAsCompleted done: status=${result.status}`);
  }

  runLocked<T>(id: number, fn: () => Promise<T>): Promise<T> {
    return withGameDateLock(id, fn);
  }
}
