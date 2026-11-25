import { NextRequest } from 'next/server'
import { requireComision } from '@/lib/api-auth'
import { getTournamentReportSummary } from '@/lib/tournament-report'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { tournamentIdParamsSchema } from '@poker/shared'

/**
 * GET /api/stats/tournament-report/[tournamentId]/summary (Comision)
 *
 * El Resumen del torneo que trae la hoja del mismo nombre del Excel, y la
 * lista de hojas. Lo muestran las pantallas de Reportes (web y app) antes de
 * descargar. Formato estandar `{ success, data }`.
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) => {
  await requireComision(request)
  const { tournamentId } = parseParams(await params, tournamentIdParamsSchema)

  const summary = await getTournamentReportSummary(tournamentId)
  if (!summary) {
    throw AppError.notFound('Torneo no encontrado')
  }
  return ok(summary)
})
