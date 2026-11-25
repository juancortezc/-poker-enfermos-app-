import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

/**
 * GET /api/tournaments/winners
 * Obtener todos los ganadores históricos de torneos
 */
export const GET = withErrorHandler(async () => {
  const winners = await getTournamentWinnersWithFallback(prisma)
  return ok(winners)
})
