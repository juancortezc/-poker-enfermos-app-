import { db } from '@/lib/prisma-tx';
import { Elimination } from '@/domain/elimination';
import { EliminationRepository } from '@/application/elimination';
import { EliminationMapper } from '../mappers/EliminationMapper';

/**
 * Prisma implementation of the EliminationRepository port.
 */
export class PrismaEliminationRepository implements EliminationRepository {
  async save(elimination: Elimination): Promise<Elimination> {
    // Get total players for the game date (needed for domain reconstruction)
    const gameDate = await db().gameDate.findUnique({
      where: { id: elimination.gameDateId },
      select: { playerIds: true },
    });
    const totalPlayers = gameDate?.playerIds.length ?? 0;

    const data = EliminationMapper.toPrismaCreate(elimination);
    const created = await db().elimination.create({ data });

    return EliminationMapper.toDomain(created, totalPlayers);
  }

  async findById(id: number): Promise<Elimination | null> {
    const elimination = await db().elimination.findUnique({
      where: { id },
      include: {
        gameDate: {
          select: { playerIds: true },
        },
      },
    });

    if (!elimination) return null;

    const totalPlayers = elimination.gameDate.playerIds.length;
    return EliminationMapper.toDomain(elimination, totalPlayers);
  }

  async findByGameDateId(gameDateId: number): Promise<Elimination[]> {
    const gameDate = await db().gameDate.findUnique({
      where: { id: gameDateId },
      select: { playerIds: true },
    });
    const totalPlayers = gameDate?.playerIds.length ?? 0;

    const eliminations = await db().elimination.findMany({
      where: { gameDateId },
      orderBy: { position: 'asc' }, // Ascendente: posición 1 (último eliminado) primero
    });

    return eliminations.map((e) => EliminationMapper.toDomain(e, totalPlayers));
  }

  async existsByPlayerInGameDate(playerId: string, gameDateId: number): Promise<boolean> {
    const count = await db().elimination.count({
      where: {
        gameDateId,
        eliminatedPlayerId: playerId,
      },
    });
    return count > 0;
  }

  async existsByPositionInGameDate(position: number, gameDateId: number): Promise<boolean> {
    const count = await db().elimination.count({
      where: {
        gameDateId,
        position,
      },
    });
    return count > 0;
  }

  async findByPlayerInGameDate(
    playerId: string,
    gameDateId: number
  ): Promise<Elimination | null> {
    const gameDate = await db().gameDate.findUnique({
      where: { id: gameDateId },
      select: { playerIds: true },
    });
    const totalPlayers = gameDate?.playerIds.length ?? 0;

    const elimination = await db().elimination.findFirst({
      where: {
        gameDateId,
        eliminatedPlayerId: playerId,
      },
    });

    if (!elimination) return null;

    return EliminationMapper.toDomain(elimination, totalPlayers);
  }

  async findLowestPosition(gameDateId: number): Promise<number | null> {
    const agg = await db().elimination.aggregate({
      where: { gameDateId },
      _min: { position: true },
    });
    return agg._min.position;
  }

  async countByGameDateId(gameDateId: number): Promise<number> {
    return db().elimination.count({
      where: { gameDateId },
    });
  }

  async update(elimination: Elimination): Promise<Elimination> {
    if (!elimination.id) {
      throw new Error('Cannot update elimination without ID');
    }

    const gameDate = await db().gameDate.findUnique({
      where: { id: elimination.gameDateId },
      select: { playerIds: true },
    });
    const totalPlayers = gameDate?.playerIds.length ?? 0;

    const data = EliminationMapper.toPrismaUpdate(elimination);
    const updated = await db().elimination.update({
      where: { id: elimination.id },
      data,
    });

    return EliminationMapper.toDomain(updated, totalPlayers);
  }

  async delete(id: number): Promise<void> {
    await db().elimination.delete({
      where: { id },
    });
  }

  async existsLaterEliminations(gameDateId: number, position: number): Promise<boolean> {
    // Later eliminations have LOWER position numbers (closer to 1)
    const count = await db().elimination.count({
      where: {
        gameDateId,
        position: { lt: position },
      },
    });
    return count > 0;
  }
}
