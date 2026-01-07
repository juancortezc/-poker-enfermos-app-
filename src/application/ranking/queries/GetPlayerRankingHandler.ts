import { RankingCalculator, TournamentRanking, PlayerRanking } from '@/domain/ranking';
import {
  GetPlayerRankingUseCase,
  GetPlayerRankingQuery,
} from '../ports/input/GetPlayerRankingUseCase';
import { PlayerRankingDTO } from '../ports/input/GetTournamentRankingUseCase';
import { TournamentRankingRepository } from '../ports/output/TournamentRankingRepository';

/**
 * Handles fetching a specific player's ranking in a tournament.
 */
export class GetPlayerRankingHandler implements GetPlayerRankingUseCase {
  private readonly calculator: RankingCalculator;

  constructor(private readonly repository: TournamentRankingRepository) {
    this.calculator = new RankingCalculator();
  }

  async execute(query: GetPlayerRankingQuery): Promise<PlayerRankingDTO | null> {
    // 1. Fetch tournament data
    const data = await this.repository.getTournamentRankingData(query.tournamentId);
    if (!data) {
      return null;
    }

    // 2. Calculate ranking
    const currentRanking = this.calculator.calculate(
      data.tournament,
      data.playerInputs,
      null
    );

    // 3. Calculate previous ranking for trends
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

    // 5. Find the player
    const playerRanking = currentRanking.getPlayerRanking(query.playerId);
    if (!playerRanking) {
      return null;
    }

    // 6. Map to DTO
    return this.toDTO(playerRanking);
  }

  private toDTO(pr: PlayerRanking): PlayerRankingDTO {
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
