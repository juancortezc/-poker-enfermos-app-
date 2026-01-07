import { Elimination as PrismaElimination } from '@prisma/client';
import { Elimination, Position, Points } from '@/domain/elimination';

/**
 * Maps between Prisma Elimination model and domain Elimination entity.
 */
export class EliminationMapper {
  /**
   * Converts a Prisma elimination to a domain entity.
   */
  static toDomain(prisma: PrismaElimination, totalPlayers: number): Elimination {
    return Elimination.reconstitute({
      id: prisma.id,
      gameDateId: prisma.gameDateId,
      position: Position.create(prisma.position, totalPlayers),
      points: Points.fromValue(prisma.points),
      eliminatedPlayerId: prisma.eliminatedPlayerId,
      eliminatorPlayerId: prisma.eliminatorPlayerId,
      eliminationTime: new Date(prisma.eliminationTime),
    });
  }

  /**
   * Converts a domain entity to Prisma create input.
   */
  static toPrismaCreate(entity: Elimination): {
    gameDateId: number;
    position: number;
    points: number;
    eliminatedPlayerId: string;
    eliminatorPlayerId: string;
    eliminationTime: string;
  } {
    return {
      gameDateId: entity.gameDateId,
      position: entity.position.value,
      points: entity.points.value,
      eliminatedPlayerId: entity.eliminatedPlayerId,
      eliminatorPlayerId: entity.eliminatorPlayerId ?? entity.eliminatedPlayerId, // Self if no eliminator
      eliminationTime: entity.eliminationTime.toISOString(),
    };
  }

  /**
   * Converts a domain entity to Prisma update input.
   */
  static toPrismaUpdate(entity: Elimination): {
    eliminatedPlayerId: string;
    eliminatorPlayerId: string;
  } {
    return {
      eliminatedPlayerId: entity.eliminatedPlayerId,
      eliminatorPlayerId: entity.eliminatorPlayerId ?? entity.eliminatedPlayerId,
    };
  }
}
