import { NextRequest } from 'next/server'
import { computeTournamentAwards } from '@/lib/awards-utils'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { tournamentIdParamsSchema, withTournamentPhotos } from '@poker/shared'

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) => {
  const { tournamentId } = parseParams(await params, tournamentIdParamsSchema)

  const response = await computeTournamentAwards(tournamentId)
  if (!response) {
    throw AppError.notFound('Torneo no encontrado')
  }

  // Fotos del torneo: en uno anterior al T31, las de entonces.
  return ok(withTournamentPhotos(response, response.tournament.number))
})
