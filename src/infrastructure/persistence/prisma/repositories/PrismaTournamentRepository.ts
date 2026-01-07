import { prisma } from '@/lib/prisma';
import type { TournamentRepository } from '@/application/tournament';
import {
  Tournament,
  type TournamentStatus,
  type GameDateInfo,
  type TournamentParticipant,
  type BlindLevel,
  type GameDateStatus,
} from '@/domain/tournament';

type PrismaTournamentStatus = 'ACTIVO' | 'COMPLETADO' | 'CANCELLED';

/**
 * Prisma implementation of TournamentRepository.
 */
export class PrismaTournamentRepository implements TournamentRepository {
  async findAll(status?: TournamentStatus): Promise<Tournament[]> {
    const where = status ? { status: status as PrismaTournamentStatus } : {};

    const tournaments = await prisma.tournament.findMany({
      where,
      include: this.getIncludeClause(),
      orderBy: { number: 'desc' },
    });

    return tournaments.map((t) => this.toDomain(t));
  }

  async findById(id: number): Promise<Tournament | null> {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: this.getIncludeClause(),
    });

    return tournament ? this.toDomain(tournament) : null;
  }

  async findActive(): Promise<Tournament | null> {
    const tournament = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      include: this.getIncludeClause(),
    });

    return tournament ? this.toDomain(tournament) : null;
  }

  async findMostRecent(): Promise<Tournament | null> {
    const tournament = await prisma.tournament.findFirst({
      orderBy: { number: 'desc' },
      include: this.getIncludeClause(),
    });

    return tournament ? this.toDomain(tournament) : null;
  }

  private getIncludeClause() {
    return {
      gameDates: {
        orderBy: { dateNumber: 'asc' as const },
      },
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      blindLevels: {
        orderBy: { level: 'asc' as const },
      },
    };
  }

  private toDomain(
    data: Awaited<ReturnType<typeof prisma.tournament.findFirst>> & {
      gameDates: Array<{
        id: number;
        dateNumber: number;
        scheduledDate: Date;
        status: string;
        playerIds: string[];
        guestIds: string[];
        location: string | null;
      }>;
      tournamentParticipants: Array<{
        playerId: string;
        confirmed: boolean;
        createdAt: Date;
        player: { id: string; firstName: string; lastName: string };
      }>;
      blindLevels: Array<{
        level: number;
        smallBlind: number;
        bigBlind: number;
        duration: number;
      }>;
    }
  ): Tournament {
    if (!data) throw new Error('Cannot convert null tournament');

    const gameDates: GameDateInfo[] = data.gameDates.map((gd) => ({
      id: gd.id,
      dateNumber: gd.dateNumber,
      scheduledDate: gd.scheduledDate,
      status: gd.status as GameDateStatus,
      playerIds: gd.playerIds,
      guestIds: gd.guestIds,
      location: gd.location ?? undefined,
    }));

    const participants: TournamentParticipant[] = data.tournamentParticipants.map(
      (tp) => ({
        playerId: tp.playerId,
        playerName: `${tp.player.firstName} ${tp.player.lastName}`,
        confirmed: tp.confirmed,
        joinedAt: tp.createdAt,
      })
    );

    const blindLevels: BlindLevel[] = data.blindLevels.map((bl) => ({
      level: bl.level,
      smallBlind: bl.smallBlind,
      bigBlind: bl.bigBlind,
      duration: bl.duration,
    }));

    return Tournament.create({
      id: data.id,
      name: data.name,
      number: data.number,
      status: data.status as TournamentStatus,
      gameDates,
      participants,
      blindLevels,
      createdAt: data.createdAt,
    });
  }
}
