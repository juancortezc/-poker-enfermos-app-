import { prisma } from './prisma';

/**
 * Sums the point penalties (`pointsPenalty`) from PlayerAdjustment records
 * per player for a tournament. Chips/money amounts are informational only
 * and do not affect the ranking.
 */
export async function getPointPenaltiesByPlayer(tournamentId: number): Promise<Map<string, number>> {
  const adjustments = await prisma.playerAdjustment.findMany({
    where: { tournamentId, pointsPenalty: { not: 0 } },
    select: { playerId: true, pointsPenalty: true },
  });

  const penalties = new Map<string, number>();
  for (const adjustment of adjustments) {
    penalties.set(adjustment.playerId, (penalties.get(adjustment.playerId) ?? 0) + adjustment.pointsPenalty);
  }
  return penalties;
}
