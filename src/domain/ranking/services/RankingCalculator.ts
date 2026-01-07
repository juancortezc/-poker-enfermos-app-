import { PlayerRanking, RankedPlayerInfo } from '../entities/PlayerRanking';
import { TournamentRanking, RankedTournamentInfo } from '../entities/TournamentRanking';
import { TiebreakerStats } from '../value-objects/TiebreakerStats';
import { Points } from '@/domain/elimination';

/**
 * Data about a player's participation in a single game date.
 */
export interface GameDateParticipation {
  dateNumber: number;
  played: boolean;
  position: number | null; // null if still playing or absent
  points: number;
}

/**
 * Input data for calculating a player's ranking.
 */
export interface PlayerRankingInput {
  player: RankedPlayerInfo;
  participations: GameDateParticipation[];
}

/**
 * Domain Service that orchestrates the ranking calculation.
 *
 * Takes raw participation data and produces a complete TournamentRanking
 * with positions, scores, tiebreaker stats, and trends.
 */
export class RankingCalculator {
  /**
   * Calculates the complete tournament ranking.
   *
   * @param tournament - Tournament info
   * @param playerInputs - Participation data for each registered player
   * @param previousRanking - Previous ranking for trend calculation (optional)
   */
  calculate(
    tournament: RankedTournamentInfo,
    playerInputs: PlayerRankingInput[],
    previousRanking?: TournamentRanking | null
  ): TournamentRanking {
    // Build PlayerRanking for each player
    const playerRankings = playerInputs.map((input) =>
      this.buildPlayerRanking(input)
    );

    // Create the tournament ranking (sorts and assigns positions)
    const ranking = TournamentRanking.create(tournament, playerRankings);

    // Apply trends if we have previous ranking
    if (previousRanking !== undefined) {
      ranking.applyTrends(previousRanking);
    }

    return ranking;
  }

  /**
   * Calculates ranking for a subset of dates (for trend calculation).
   * Does not apply trends.
   */
  calculateForDates(
    tournament: RankedTournamentInfo,
    playerInputs: PlayerRankingInput[],
    maxDateNumber: number
  ): TournamentRanking {
    // Filter participations to only include dates up to maxDateNumber
    const filteredInputs = playerInputs.map((input) => ({
      ...input,
      participations: input.participations.filter(
        (p) => p.dateNumber <= maxDateNumber
      ),
    }));

    const adjustedTournament = {
      ...tournament,
      completedDates: Math.min(tournament.completedDates, maxDateNumber),
    };

    return this.calculate(adjustedTournament, filteredInputs, null);
  }

  private buildPlayerRanking(input: PlayerRankingInput): PlayerRanking {
    const pointsByDate = new Map<number, number>();
    let datesPlayed = 0;
    let tiebreaker = TiebreakerStats.empty();

    for (const participation of input.participations) {
      pointsByDate.set(participation.dateNumber, participation.points);

      if (participation.played) {
        datesPlayed++;

        // Update tiebreaker stats based on position
        if (participation.position !== null) {
          if (participation.position === 1) {
            tiebreaker = tiebreaker.withFirstPlace();
          } else if (participation.position === 2) {
            tiebreaker = tiebreaker.withSecondPlace();
          } else if (participation.position === 3) {
            tiebreaker = tiebreaker.withThirdPlace();
          }
        }
      } else {
        // Absence
        tiebreaker = tiebreaker.withAbsence();
      }
    }

    return PlayerRanking.create(input.player, pointsByDate, datesPlayed, tiebreaker);
  }
}
