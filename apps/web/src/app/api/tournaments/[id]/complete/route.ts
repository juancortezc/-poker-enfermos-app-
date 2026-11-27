import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { completeTournamentSchema, idParamsSchema } from '@poker/shared'
import { requireComision } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'
import { generateTournamentWinners } from '@/lib/tournament-winners'
import { assertCanFinalize } from '@/lib/data-integrity'
import { parseToUTCNoon } from '@/lib/date-utils'
import { sendNotificationIfEnabled } from '@/lib/notification-config'

// POST /api/tournaments/[id]/complete - Completar torneo activo
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireComision(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)
  // Accion valida y, para modify_date, endDate obligatoria (si no, 422).
  const body = await parseBody(req, completeTournamentSchema)
  const { action } = body

  // Verificar que el torneo existe y está activo
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      gameDates: {
        orderBy: { dateNumber: 'desc' },
        take: 1
      }
    }
  })

  if (!tournament) {
    throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
  }

  if (tournament.status !== 'ACTIVO') {
    throw AppError.badRequest('El torneo no está activo', 'TOURNAMENT_NOT_ACTIVE')
  }

  if (body.action === 'modify_date') {
    // Modificar fecha final del torneo
    const { endDate } = body
    const lastGameDate = tournament.gameDates[0]
    if (lastGameDate) {
      await prisma.gameDate.update({
        where: { id: lastGameDate.id },
        // Mediodía UTC del día elegido, como toda fecha de juego: con
        // new Date('YYYY-MM-DD') quedaba a las 00:00 UTC, el día anterior
        // en Ecuador.
        data: { scheduledDate: parseToUTCNoon(endDate) }
      })
    }

    return ok({
      message: 'Fecha final actualizada correctamente'
    })
  } else if (action === 'complete_tournament') {
    // 409 TOURNAMENT_HAS_OPEN_DATES si queda alguna fecha sin completar ni
    // cancelar: colgada, bloquearía crear las fechas del torneo siguiente.
    await assertCanFinalize(prisma, tournament)

    // Completar torneo (cambiar status a FINALIZADO)
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'FINALIZADO',
        updatedAt: new Date()
      },
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
                lastName: true
              }
            }
          }
        }
      }
    })

    // Auto-generate TournamentWinners record
    let winnersGenerated = false
    let winnersError = null

    try {
      await generateTournamentWinners(prisma, tournamentId)
      winnersGenerated = true
      console.log(`✅ TournamentWinners auto-generated for Tournament ${updatedTournament.number}`)
    } catch (error) {
      winnersError = error instanceof Error ? error.message : 'Unknown error'
      console.error(`⚠️  Failed to auto-generate TournamentWinners for Tournament ${updatedTournament.number}:`, error)
      // Continue without failing the tournament completion
    }

    // Send notification about tournament completion (if enabled)
    await sendNotificationIfEnabled(
      'tournament_completed',
      '🏆 Torneo Completado',
      `El Torneo ${updatedTournament.number} ha sido finalizado oficialmente`,
      {
        tournamentId: updatedTournament.id,
        tournamentNumber: updatedTournament.number
      }
    )

    return ok({
      message: 'Torneo completado correctamente',
      tournament: updatedTournament,
      winnersGenerated,
      winnersError
    })
  }

  // Fallback - should never reach here due to action validation above
  throw AppError.badRequest('Acción no procesada')
})