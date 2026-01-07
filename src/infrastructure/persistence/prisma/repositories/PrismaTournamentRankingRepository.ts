import { prisma } from '@/lib/prisma';
import { calculatePointsForPosition } from '@/lib/tournament-utils';
import type {
  TournamentRankingRepository,
  TournamentRankingData,
} from '@/application/ranking';
import type {
  RankedTournamentInfo,
  RankedPlayerInfo,
  GameDateParticipation,
  PlayerRankingInput,
} from '@/domain/ranking';

/**
 * Prisma implementation of TournamentRankingRepository.
 *
 * Fetches tournament, player, and elimination data from Prisma
 * and transforms it into the format needed by the domain layer.
 */
export class PrismaTournamentRankingRepository implements TournamentRankingRepository {
  async getTournamentRankingData(
    tournamentId: number
  ): Promise<TournamentRankingData | null> {
    const tournament = await this.fetchTournamentWithData(tournamentId);
    if (!tournament) return null;

    return this.transformToRankingData(tournament);
  }

  async getTournamentRankingDataUpToDate(
    tournamentId: number,
    maxDateNumber: number
  ): Promise<TournamentRankingData | null> {
    const tournament = await this.fetchTournamentWithData(tournamentId, maxDateNumber);
    if (!tournament) return null;

    return this.transformToRankingData(tournament, maxDateNumber);
  }

  private async fetchTournamentWithData(
    tournamentId: number,
    maxDateNumber?: number
  ) {
    return prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        tournamentParticipants: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                aliases: true,
                photoUrl: true,
              },
            },
          },
        },
        gameDates: {
          where: {
            status: { in: ['completed', 'in_progress'] },
            ...(maxDateNumber !== undefined && { dateNumber: { lte: maxDateNumber } }),
          },
          include: {
            eliminations: {
              include: {
                eliminatedPlayer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            dateNumber: 'asc',
          },
        },
      },
    });
  }

  private transformToRankingData(
    tournament: NonNullable<Awaited<ReturnType<typeof this.fetchTournamentWithData>>>,
    maxDateNumber?: number
  ): TournamentRankingData {
    // Build tournament info
    const tournamentInfo: RankedTournamentInfo = {
      id: tournament.id,
      name: tournament.name,
      number: tournament.number,
      totalDates: 12, // Always 12 dates per tournament
      completedDates: tournament.gameDates.length,
    };

    // Get registered players (participants)
    const registeredPlayers = tournament.tournamentParticipants.map((tp) => ({
      id: tp.player.id,
      name: `${tp.player.firstName} ${tp.player.lastName}`,
      alias: tp.player.aliases?.[0] || undefined,
      photoUrl: tp.player.photoUrl || undefined,
    }));

    // Build participation data for each player
    const playerInputs: PlayerRankingInput[] = registeredPlayers.map((player) => {
      const participations = this.buildParticipations(
        player.id,
        tournament.gameDates,
        maxDateNumber
      );

      return {
        player: player as RankedPlayerInfo,
        participations,
      };
    });

    return {
      tournament: tournamentInfo,
      playerInputs,
    };
  }

  private buildParticipations(
    playerId: string,
    gameDates: Array<{
      dateNumber: number;
      status: string;
      playerIds: string[];
      eliminations: Array<{
        position: number;
        points: number;
        eliminatedPlayerId: string;
      }>;
    }>,
    maxDateNumber?: number
  ): GameDateParticipation[] {
    const participations: GameDateParticipation[] = [];

    for (const gameDate of gameDates) {
      if (maxDateNumber !== undefined && gameDate.dateNumber > maxDateNumber) {
        continue;
      }

      const played = gameDate.playerIds.includes(playerId);
      const elimination = gameDate.eliminations.find(
        (e) => e.eliminatedPlayerId === playerId
      );

      if (played) {
        if (elimination) {
          // Player was eliminated at a specific position
          participations.push({
            dateNumber: gameDate.dateNumber,
            played: true,
            position: elimination.position,
            points: elimination.points,
          });
        } else {
          // Player participated but not eliminated yet
          // Check if they're the winner (only one left or date completed)
          const totalPlayers = gameDate.playerIds.length;
          const eliminatedCount = gameDate.eliminations.length;
          const activePlayersCount = totalPlayers - eliminatedCount;

          if (activePlayersCount === 1 || gameDate.status === 'completed') {
            // This player is the winner
            const secondPlace = gameDate.eliminations.find((e) => e.position === 2);
            const winnerPoints = secondPlace
              ? secondPlace.points + 3
              : calculatePointsForPosition(1, totalPlayers);

            participations.push({
              dateNumber: gameDate.dateNumber,
              played: true,
              position: 1,
              points: winnerPoints,
            });
          } else {
            // Still playing, no points yet
            participations.push({
              dateNumber: gameDate.dateNumber,
              played: true,
              position: null,
              points: 0,
            });
          }
        }
      } else {
        // Absence - 0 points
        participations.push({
          dateNumber: gameDate.dateNumber,
          played: false,
          position: null,
          points: 0,
        });
      }
    }

    return participations;
  }
}
