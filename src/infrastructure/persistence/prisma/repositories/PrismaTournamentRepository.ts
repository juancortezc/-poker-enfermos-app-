import { Prisma } from '@prisma/client';
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

/**
 * El include y el tipo del resultado se declaran juntos y el tipo se DERIVA
 * del include. Antes la firma de toDomain se escribia a mano y habia quedado
 * desincronizada del esquema: declaraba `guestIds`, `location` y `createdAt`,
 * tres campos que no existen en la base. Compilaba solo porque el build
 * ignoraba los errores de tipos.
 */
const TOURNAMENT_INCLUDE = {
  gameDates: {
    orderBy: { dateNumber: 'asc' as const },
  },
  tournamentParticipants: {
    include: {
      player: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  },
  blindLevels: {
    orderBy: { level: 'asc' as const },
  },
} satisfies Prisma.TournamentInclude;

type TournamentConRelaciones = Prisma.TournamentGetPayload<{
  include: typeof TOURNAMENT_INCLUDE;
}>;

/**
 * Prisma implementation of TournamentRepository.
 */
export class PrismaTournamentRepository implements TournamentRepository {
  async findAll(status?: TournamentStatus): Promise<Tournament[]> {
    const where: Prisma.TournamentWhereInput = status ? { status } : {};

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
    return TOURNAMENT_INCLUDE;
  }

  private getIncludeClauseUnused() {
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

  private toDomain(data: TournamentConRelaciones): Tournament {
    const gameDates: GameDateInfo[] = data.gameDates.map((gd) => ({
      id: gd.id,
      dateNumber: gd.dateNumber,
      scheduledDate: gd.scheduledDate,
      status: gd.status as GameDateStatus,
      playerIds: gd.playerIds,
    }));

    const participants: TournamentParticipant[] = data.tournamentParticipants.map(
      (tp) => ({
        playerId: tp.playerId,
        playerName: `${tp.player.firstName} ${tp.player.lastName}`,
        confirmed: tp.confirmed,
        joinedAt: tp.joinedAt,
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
