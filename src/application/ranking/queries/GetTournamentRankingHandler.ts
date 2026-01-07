import {
  RankingCalculator,
  TournamentRanking,
  PlayerRanking,
} from '@/domain/ranking';
import {
  GetTournamentRankingUseCase,
  GetTournamentRankingQuery,
  TournamentRankingDTO,
  PlayerRankingDTO,
} from '../ports/input/GetTournamentRankingUseCase';
import { TournamentRankingRepository } from '../ports/output/TournamentRankingRepository';

/**
 * Handles fetching and calculating a tournament's complete ranking.
 */
export class GetTournamentRankingHandler implements GetTournamentRankingUseCase {
  private readonly calculator: RankingCalculator;

  constructor(private readonly repository: TournamentRankingRepository) {
    this.calculator = new RankingCalculator();
  }

  async execute(query: GetTournamentRankingQuery): Promise<TournamentRankingDTO | null> {
    // 1. Fetch tournament data
    const data = await this.repository.getTournamentRankingData(query.tournamentId);
    if (!data) {
      return null;
    }

    // 2. Calculate current ranking
    const currentRanking = this.calculator.calculate(
      data.tournament,
      data.playerInputs,
      null // No trends yet
    );

    // 3. Calculate previous ranking for trends (if we have 2+ dates)
    let previousRanking: TournamentRanking | null = null;
    if (data.tournament.completedDates >= 2) {
      const previousData = await this.repository.getTournamentRankingDataUpToDate(
        query.tournamentId,
        data.tournament.completedDates - 1
      );

      if (previousData) {
        previousRanking = this.calculator.calculate(
          previousData.tournament,
          previousData.playerInputs,
          null
        );
      }
    }

    // 4. Apply trends
    currentRanking.applyTrends(previousRanking);

    // 5. Map to DTO
    return this.toDTO(currentRanking);
  }

  private toDTO(ranking: TournamentRanking): TournamentRankingDTO {
    return {
      tournament: {
        id: ranking.tournamentId,
        name: ranking.tournamentName,
        number: ranking.tournamentNumber,
        totalDates: ranking.totalDates,
        completedDates: ranking.completedDates,
      },
      rankings: ranking.rankings.map((pr) => this.playerRankingToDTO(pr)),
      lastUpdated: ranking.lastUpdated.toISOString(),
    };
  }

  private playerRankingToDTO(pr: PlayerRanking): PlayerRankingDTO {
    return {
      position: pr.position,
      playerId: pr.playerId,
      playerName: pr.playerName,
      playerAlias: pr.playerAlias,
      playerPhoto: pr.playerPhoto,
      totalPoints: pr.totalPoints,
      datesPlayed: pr.datesPlayed,
      pointsByDate: pr.pointsByDate,
      trend: pr.trend.direction,
      positionsChanged: pr.trend.positionsChanged,
      elimina1: pr.elimina1,
      elimina2: pr.elimina2,
      finalScore: pr.score.isApplied ? pr.finalScore : undefined,
      firstPlaces: pr.firstPlaces,
      secondPlaces: pr.secondPlaces,
      thirdPlaces: pr.thirdPlaces,
      absences: pr.absences,
    };
  }
}
