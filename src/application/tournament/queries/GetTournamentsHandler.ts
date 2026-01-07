import type { TournamentRepository } from '../ports/output/TournamentRepository';
import type {
  GetTournamentsUseCase,
  GetTournamentsQuery,
  TournamentListItem,
} from '../ports/input/GetTournamentsUseCase';

/**
 * Handler for getting tournaments list.
 */
export class GetTournamentsHandler implements GetTournamentsUseCase {
  constructor(private readonly repository: TournamentRepository) {}

  async execute(query: GetTournamentsQuery): Promise<TournamentListItem[]> {
    const tournaments = await this.repository.findAll(query.status);

    return tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      number: t.number,
      status: t.status,
      totalDates: t.totalDates,
      completedDates: t.completedDates,
      participantCount: t.participantCount,
      createdAt: t.createdAt,
    }));
  }
}
