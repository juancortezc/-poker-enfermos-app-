import { idParamsSchema } from '@poker/shared'
import { prisma } from '@/lib/prisma'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'

// GET /api/tournaments/:id/dates/public - Obtener fechas públicas del torneo
export const GET = withErrorHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: tournamentId } = parseParams(await params, idParamsSchema)

    // Obtener fechas del torneo con información básica
    const dates = await prisma.gameDate.findMany({
      where: {
        tournamentId: tournamentId
      },
      select: {
        id: true,
        dateNumber: true,
        status: true,
        scheduledDate: true,
        playerIds: true // Needed to count participants
      },
      orderBy: {
        dateNumber: 'asc'
      }
    })

    return ok(dates)
  }
)
