import { prisma } from '@/lib/prisma'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'
import { withTournamentPhotos } from '@poker/shared'

/**
 * GET /api/tournaments/previous
 * Obtiene el último torneo FINALIZADO
 * Útil para mostrar resultados cuando el torneo activo aún no tiene datos
 */
export const GET = withErrorHandler(async () => {
  // Buscar el torneo más reciente con estado FINALIZADO
  const previousTournament = await prisma.tournament.findFirst({
    where: { status: 'FINALIZADO' },
    orderBy: { number: 'desc' },
    include: {
      gameDates: {
        orderBy: { dateNumber: 'asc' }
      },
      tournamentParticipants: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              photoUrl: true,
              aliases: true
            }
          }
        }
      },
      blindLevels: {
        orderBy: { level: 'asc' }
      },
      _count: {
        select: {
          tournamentParticipants: true,
          gameDates: true
        }
      }
    }
  })

  if (!previousTournament) {
    throw AppError.notFound('No hay torneo finalizado', 'TOURNAMENT_NOT_FOUND')
  }

  // Calcular estadísticas
  const completedDates = previousTournament.gameDates.filter(
    d => d.status === 'completed'
  ).length

  return ok({
    // Fotos del torneo: en uno anterior al T31, las de entonces.
    tournament: withTournamentPhotos(previousTournament, previousTournament.number),
    stats: {
      completedDates,
      totalDates: previousTournament.gameDates.length,
      isCompleted: true
    }
  })
})
