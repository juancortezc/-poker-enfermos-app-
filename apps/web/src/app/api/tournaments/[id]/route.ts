import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { idParamsSchema, updateTournamentSchema, withTournamentPhotos } from '@poker/shared'
import { requireComision } from '@/lib/api-auth'
import { applyCalendarEdit, applyParticipantsEdit } from '@/lib/tournament-edit'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'
import { assertCanFinalize, assertNoOtherActiveTournament } from '@/lib/data-integrity'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/tournaments/[id] - Obtener torneo específico (público)
export const GET = withErrorHandler(async (_req: NextRequest, { params }: Ctx) => {
  const { id: tournamentId } = parseParams(await params, idParamsSchema)

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
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
      tournamentRankings: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true
            }
          }
        }
      }
    }
  })

  if (!tournament) {
    throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
  }

  // Fotos del torneo: en uno anterior al T31, las de entonces.
  return ok(withTournamentPhotos(tournament, tournament.number))
})

// PUT /api/tournaments/[id] - Actualizar torneo (Comisión).
// Jugadores (`participantIds`, lista completa) y calendario (`calendar`, lista
// completa; o `gameDates`, formato viejo) siguen las reglas de
// @poker/shared/tournament-edit: lo jugado no se toca. Todo en una transacción.
export const PUT = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireComision(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)
  const {
    name,
    status,
    gameDates,
    calendar,
    participantIds,
    blindLevels
  } = await parseBody(req, updateTournamentSchema)

  // Verificar que el torneo existe
  const existingTournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  })

  if (!existingTournament) {
    throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
  }

  // Cambio de estado: las mismas reglas que /complete. Activar con otro
  // torneo ACTIVO o finalizar con fechas abiertas es 409.
  if (status === 'ACTIVO' && existingTournament.status !== 'ACTIVO') {
    await assertNoOtherActiveTournament(prisma, tournamentId)
  }
  if (status === 'FINALIZADO' && existingTournament.status !== 'FINALIZADO') {
    await assertCanFinalize(prisma, existingTournament)
  }

  await prisma.$transaction(async (tx) => {
    // Jugadores y calendario se validan con el estado de antes del cambio.
    if (participantIds !== undefined) {
      await applyParticipantsEdit(tx, existingTournament, participantIds)
    }
    if (calendar !== undefined || gameDates !== undefined) {
      await applyCalendarEdit(tx, existingTournament, { calendar, gameDatesPatch: gameDates })
    }

    if (name !== undefined || status !== undefined) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(status !== undefined ? { status } : {})
        }
      })
    }

    if (blindLevels) {
      await tx.blindLevel.deleteMany({ where: { tournamentId } })
      await tx.blindLevel.createMany({
        data: blindLevels.map((blind) => ({
          tournamentId,
          level: blind.level,
          smallBlind: blind.smallBlind,
          bigBlind: blind.bigBlind,
          duration: blind.duration
        }))
      })
    }
  }, { timeout: 15000 })

  const updatedTournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
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
              photoUrl: true
            }
          }
        }
      },
      blindLevels: {
        orderBy: { level: 'asc' }
      }
    }
  })

  return ok(updatedTournament)
})

// DELETE /api/tournaments/[id] - Eliminar torneo (cancelar)
export const DELETE = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireComision(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)

  const existingTournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  })

  if (!existingTournament) {
    throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
  }

  // Eliminar torneo (cascade eliminará todo lo relacionado)
  await prisma.tournament.delete({
    where: { id: tournamentId }
  })

  return ok({
    message: 'Torneo eliminado correctamente'
  })
})