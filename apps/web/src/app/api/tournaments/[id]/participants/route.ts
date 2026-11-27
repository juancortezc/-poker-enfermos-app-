import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  addTournamentParticipantSchema,
  idParamsSchema,
  removeTournamentParticipantQuerySchema,
} from '@poker/shared'
import { requireComision, requireUser } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams, parseQuery } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }
import { applyParticipantsEdit } from '@/lib/tournament-edit'

// GET /api/tournaments/[id]/participants - Obtener participantes de un torneo
export const GET = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireUser(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true,
          aliases: true,
          isActive: true
        }
      }
    },
    orderBy: {
      player: {
        firstName: 'asc'
      }
    }
  })

  return ok(participants)
})

// POST /api/tournaments/[id]/participants - Agregar participante al torneo
export const POST = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireComision(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)
  const { playerId } = await parseBody(req, addTournamentParticipantSchema)

  // Verificar que el torneo existe
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  })

  if (!tournament) {
    throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
  }

  // Verificar que no esté ya participando
  const existingParticipant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId
      }
    }
  })

  if (existingParticipant) {
    throw AppError.badRequest('El jugador ya está participando en este torneo', 'ALREADY_PARTICIPANT')
  }

  // Mismas reglas que editar el torneo (Invitados e inactivos no; torneo
  // abierto) y participantIds queda igual que TournamentParticipant.
  await prisma.$transaction(async (tx) => {
    const current = await tx.tournamentParticipant.findMany({ where: { tournamentId }, select: { playerId: true } })
    await applyParticipantsEdit(tx, tournament, [...current.map((p) => p.playerId), playerId])
  })

  const participant = await prisma.tournamentParticipant.findUniqueOrThrow({
    where: { tournamentId_playerId: { tournamentId, playerId } },
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
  })

  return ok(participant, 201)
})

// DELETE /api/tournaments/[id]/participants - Remover participante del torneo
export const DELETE = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireComision(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)
  const { playerId } = parseQuery(req, removeTournamentParticipantQuerySchema)

  const existingParticipant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId
      }
    }
  })

  if (!existingParticipant) {
    throw AppError.notFound('El jugador no está participando en este torneo', 'NOT_A_PARTICIPANT')
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!tournament) {
    throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
  }

  // Solo se quita a quien no jugó ninguna fecha del torneo.
  await prisma.$transaction(async (tx) => {
    const current = await tx.tournamentParticipant.findMany({ where: { tournamentId }, select: { playerId: true } })
    await applyParticipantsEdit(
      tx,
      tournament,
      current.map((p) => p.playerId).filter((id) => id !== playerId)
    )
  })

  return ok({
    message: 'Participante removido del torneo correctamente'
  })
})