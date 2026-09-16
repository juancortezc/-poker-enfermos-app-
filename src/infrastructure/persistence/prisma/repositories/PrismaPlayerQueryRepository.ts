import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PlayerRepository, PlayerFilter } from '@/application/player';
import { Player, type PlayerRole } from '@/domain/player';
import type { UserRole } from '@prisma/client';

/**
 * Prisma implementation of PlayerRepository for queries.
 */
/**
 * El tipo del resultado se DERIVA del include, en vez de reescribirse a mano.
 * La firma escrita a mano se habia separado de lo que la consulta devuelve.
 */
const PLAYER_INCLUDE = {
  inviter: {
    select: { id: true, firstName: true, lastName: true },
  },
  _count: {
    select: { invitees: true },
  },
} satisfies Prisma.PlayerInclude;

type PlayerConRelaciones = Prisma.PlayerGetPayload<{ include: typeof PLAYER_INCLUDE }>;

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

  private toDomain(data: PlayerConRelaciones): Player {
    return Player.create({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as PlayerRole,
      aliases: data.aliases,
      photoUrl: data.photoUrl ?? undefined,
      isActive: data.isActive,
      joinYear: data.joinYear ?? undefined,
      inviterId: data.inviter?.id,
      inviterName: data.inviter
        ? `${data.inviter.firstName} ${data.inviter.lastName}`
        : undefined,
      inviteesCount: data._count.invitees,
    });
  }
}
