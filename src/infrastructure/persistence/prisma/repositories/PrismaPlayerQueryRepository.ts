import { prisma } from '@/lib/prisma';
import type { PlayerRepository, PlayerFilter } from '@/application/player';
import { Player, type PlayerRole } from '@/domain/player';
import type { UserRole } from '@prisma/client';

/**
 * Prisma implementation of PlayerRepository for queries.
 */
export class PrismaPlayerQueryRepository implements PlayerRepository {
  async findAll(filter?: PlayerFilter): Promise<Player[]> {
    const where: Record<string, unknown> = {};

    if (filter?.roles && filter.roles.length > 0) {
      if (filter.roles.length === 1) {
        where.role = filter.roles[0] as UserRole;
      } else {
        where.role = { in: filter.roles as UserRole[] };
      }
    }

    if (!filter?.includeInactive) {
      where.isActive = true;
    }

    if (filter?.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { aliases: { has: filter.search } },
      ];
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            invitees: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });

    return players.map((p) => this.toDomain(p));
  }

  async findById(id: string): Promise<Player | null> {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            invitees: true,
          },
        },
      },
    });

    return player ? this.toDomain(player) : null;
  }

  private toDomain(
    data: {
      id: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      aliases: string[];
      photoUrl: string | null;
      isActive: boolean;
      joinYear: number;
      inviter: { id: string; firstName: string; lastName: string } | null;
      _count: { invitees: number };
    }
  ): Player {
    return Player.create({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as PlayerRole,
      aliases: data.aliases,
      photoUrl: data.photoUrl ?? undefined,
      isActive: data.isActive,
      joinYear: data.joinYear,
      inviterId: data.inviter?.id,
      inviterName: data.inviter
        ? `${data.inviter.firstName} ${data.inviter.lastName}`
        : undefined,
      inviteesCount: data._count.invitees,
    });
  }
}
