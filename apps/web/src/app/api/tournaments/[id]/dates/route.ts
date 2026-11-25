import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTournamentDateSchema, idParamsSchema } from '@poker/shared'
import { requireComision, requireUser } from '@/lib/api-auth'
import { parseToUTCNoon } from '@/lib/date-utils'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseParams } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/tournaments/[id]/dates - Obtener fechas de un torneo
export const GET = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireUser(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)

  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId },
    orderBy: { dateNumber: 'asc' },
    include: {
      gameResults: {
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
      },
      eliminations: {
        include: {
          eliminatedPlayer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              role: true
            }
          },
          eliminatorPlayer: {
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

  return ok(gameDates)
})

// POST /api/tournaments/[id]/dates - Crear nueva fecha
export const POST = withErrorHandler(async (req: NextRequest, { params }: Ctx) => {
  await requireComision(req)
  const { id: tournamentId } = parseParams(await params, idParamsSchema)
  const { dateNumber, scheduledDate, playersMin, playersMax } = await parseBody(req, createTournamentDateSchema)

  // Verificar que el torneo existe
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  })

  if (!tournament) {
    throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
  }

  // Verificar que no existe ya una fecha con ese número
  const existingDate = await prisma.gameDate.findFirst({
    where: {
      tournamentId,
      dateNumber
    }
  })

  if (existingDate) {
    throw AppError.badRequest(`Ya existe la fecha número ${dateNumber}`, 'DATE_NUMBER_TAKEN')
  }

  const gameDate = await prisma.gameDate.create({
    data: {
      tournamentId,
      dateNumber,
      scheduledDate: parseToUTCNoon(scheduledDate),
      playersMin,
      playersMax,
      playerIds: []
    }
  })

  return ok(gameDate, 201)
})