import { ParentChildStatsService } from '@/application/elimination';
import { updateParentChildStats } from '@/lib/parent-child-stats';

/**
 * Adapter that implements ParentChildStatsService port using existing stats infrastructure.
 */
export class ParentChildStatsAdapter implements ParentChildStatsService {
  async updateStats(params: {
    tournamentId: number;
    eliminatorId: string;
    eliminatedId: string;
    gameDateDate: Date;
  }): Promise<void> {
    await updateParentChildStats(
      params.tournamentId,
      params.eliminatorId,
      params.eliminatedId,
      params.gameDateDate
    );
  }
}
