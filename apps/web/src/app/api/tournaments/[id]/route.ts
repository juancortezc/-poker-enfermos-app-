import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { idParamsSchema, updateTournamentSchema } from '@poker/shared'
import { requireComision } from '@/lib/api-auth'
import { parseToUTCNoon } from '@/lib/date-utils'
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

  return ok(tournament)
})

// PUT /api/tournaments/[id] - Actualizar torneo
export const PUT = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireComision(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)
  const {
    name,
    status,
    gameDates,
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

  // Preparar datos de actualización
  const updateData: Record<string, unknown> = {}
  
  if (name !== undefined) updateData.name = name
  if (status !== undefined) updateData.status = status
  if (participantIds !== undefined) updateData.participantIds = participantIds

  // Actualizar torneo
  const updatedTournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: updateData,
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

  // Actualizar fechas si se proporcionaron
  if (gameDates && Array.isArray(gameDates)) {
    await Promise.all(
      gameDates.map((gameDate) =>
        prisma.gameDate.update({
          where: {
            id: gameDate.id,
            tournamentId: tournamentId
          },
          data: {
            scheduledDate: parseToUTCNoon(gameDate.scheduledDate),
            playersMin: gameDate.playersMin || 9,
            playersMax: gameDate.playersMax || 24
          }
        })
      )
    )
  }

  // Actualizar participantes si se proporcionaron
  if (participantIds && Array.isArray(participantIds)) {
    // Eliminar participantes actuales
    await prisma.tournamentParticipant.deleteMany({
      where: { tournamentId }
    })
    
    // Crear nuevos participantes
    await prisma.tournamentParticipant.createMany({
      data: participantIds.map((playerId) => ({
        tournamentId,
        playerId,
        confirmed: false
      }))
    })
  }

  // Actualizar blinds si se proporcionaron
  if (blindLevels && Array.isArray(blindLevels)) {
    // Eliminar blinds actuales
    await prisma.blindLevel.deleteMany({
      where: { tournamentId }
    })
    
    // Crear nuevos blinds
    await prisma.blindLevel.createMany({
      data: blindLevels.map((blind) => ({
        tournamentId,
        level: blind.level,
        smallBlind: blind.smallBlind,
        bigBlind: blind.bigBlind,
        duration: blind.duration
      }))
    })
  }

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