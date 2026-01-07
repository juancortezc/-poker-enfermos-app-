import type { TournamentStatus, GameDateStatus, BlindLevel } from '@/domain/tournament';

/**
 * Game date DTO for active tournament response.
 */
export interface GameDateDTO {
  id: number;
  dateNumber: number;
  scheduledDate: Date;
  status: GameDateStatus;
  playerIds: string[];
  guestIds: string[];
  location?: string;
}

/**
 * Participant DTO for active tournament response.
 */
export interface ParticipantDTO {
  playerId: string;
  playerName: string;
  confirmed: boolean;
  joinedAt: Date;
}

/**
 * Full tournament DTO with all details.
 */
export interface TournamentDetailDTO {
  id: number;
  name: string;
  number: number;
  status: TournamentStatus;
  gameDates: GameDateDTO[];
  participants: ParticipantDTO[];
  blindLevels: BlindLevel[];
  createdAt: Date;
}

/**
 * Stats computed for the active tournament.
 */
export interface TournamentStatsDTO {
  completedDates: number;
  totalDates: number;
  nextDate: GameDateDTO | null;
  startDate: Date | null;
  endDate: Date | null;
  isCompleted: boolean;
}

/**
 * Response for getting active tournament.
 */
export interface ActiveTournamentResult {
  tournament: TournamentDetailDTO | null;
  stats: TournamentStatsDTO | null;
}

/**
 * Use case for retrieving the active (or most recent) tournament.
 */
export interface GetActiveTournamentUseCase {
  execute(): Promise<ActiveTournamentResult>;
}
