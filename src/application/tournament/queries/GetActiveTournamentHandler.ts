import type { TournamentRepository } from '../ports/output/TournamentRepository';
import type {
  GetActiveTournamentUseCase,
  ActiveTournamentResult,
  TournamentDetailDTO,
  TournamentStatsDTO,
  GameDateDTO,
} from '../ports/input/GetActiveTournamentUseCase';
import type { Tournament } from '@/domain/tournament';

/**
 * Handler for getting the active (or most recent) tournament.
 */
export class GetActiveTournamentHandler implements GetActiveTournamentUseCase {
  constructor(private readonly repository: TournamentRepository) {}

  async execute(): Promise<ActiveTournamentResult> {
    // Try to find active tournament first
    let tournament = await this.repository.findActive();

    // If no active, get most recent
    if (!tournament) {
      tournament = await this.repository.findMostRecent();
    }

    if (!tournament) {
      return { tournament: null, stats: null };
    }

    const tournamentDTO = this.toDetailDTO(tournament);
    const stats = this.computeStats(tournament);

    return { tournament: tournamentDTO, stats };
  }

  private toDetailDTO(tournament: Tournament): TournamentDetailDTO {
    return {
      id: tournament.id,
      name: tournament.name,
      number: tournament.number,
      status: tournament.status,
      gameDates: tournament.gameDates.map((gd) => ({
        id: gd.id,
        dateNumber: gd.dateNumber,
        scheduledDate: gd.scheduledDate,
        status: gd.status,
        playerIds: gd.playerIds,
        guestIds: gd.guestIds,
        location: gd.location,
      })),
      participants: tournament.participants.map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        confirmed: p.confirmed,
        joinedAt: p.joinedAt,
      })),
      blindLevels: [...tournament.blindLevels],
      createdAt: tournament.createdAt,
    };
  }

  private computeStats(tournament: Tournament): TournamentStatsDTO {
    const gameDates = tournament.gameDates;
    const completedDates = tournament.completedDates;
    const nextDate = tournament.getNextGameDate();

    const startDate = gameDates.length > 0 ? gameDates[0].scheduledDate : null;
    const endDate =
      gameDates.length > 0 ? gameDates[gameDates.length - 1].scheduledDate : null;

    return {
      completedDates,
      totalDates: gameDates.length,
      nextDate: nextDate
        ? {
            id: nextDate.id,
            dateNumber: nextDate.dateNumber,
            scheduledDate: nextDate.scheduledDate,
            status: nextDate.status,
            playerIds: nextDate.playerIds,
            guestIds: nextDate.guestIds,
            location: nextDate.location,
          }
        : null,
      startDate,
      endDate,
      isCompleted: completedDates === gameDates.length && gameDates.length > 0,
    };
  }
}
