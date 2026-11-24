import type { TournamentStatus } from '@/domain/tournament';

/**
 * DTO for tournament list item.
 */
export interface TournamentListItem {
  id: number;
  name: string;
  number: number;
  status: TournamentStatus;
  totalDates: number;
  completedDates: number;
  participantCount: number;
  createdAt: Date;
}

/**
 * Query parameters for getting tournaments.
 */
export interface GetTournamentsQuery {
  status?: TournamentStatus;
}

/**
 * Use case for retrieving tournaments list.
 */
export interface GetTournamentsUseCase {
  execute(query: GetTournamentsQuery): Promise<TournamentListItem[]>;
}
