import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'
import { withTournamentPhotos } from '@poker/shared'

/**
 * GET /api/tournaments/winners
 * Obtener todos los ganadores históricos de torneos
 */
export const GET = withErrorHandler(async () => {
  const winners = await getTournamentWinnersWithFallback(prisma)
  // Cada podio historico con las fotos de su torneo (antes del T31, las de entonces).
  return ok(winners.map(w => withTournamentPhotos(w, w.tournamentNumber)))
})
