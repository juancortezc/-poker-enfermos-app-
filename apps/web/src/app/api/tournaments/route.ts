import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TournamentStatus } from '@prisma/client'
import { requireComision } from '@/lib/api-auth'
import { parseToUTCNoon } from '@/lib/date-utils'
import { createTournamentSchema, defaultBlindLevels, tournamentListQuerySchema, withTournamentPhotos } from '@poker/shared'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody, parseQuery } from '@/lib/http'

// GET /api/tournaments - Listar todos los torneos
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { status } = parseQuery(req, tournamentListQuerySchema)

  const where: { status?: TournamentStatus } = {}
  if (status) {
    where.status = status
  }

  const tournaments = await prisma.tournament.findMany({
    where,
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
      },
      _count: {
        select: {
          tournamentParticipants: true,
          gameDates: true
        }
      }
    },
    orderBy: { number: 'desc' }
  })

  // Cada torneo con sus fotos: antes del T31, las de entonces.
  return ok(tournaments.map(t => withTournamentPhotos(t, t.number)))
})

// POST /api/tournaments - Crear nuevo torneo
export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireComision(req)
  const {
    number,
    gameDates, // Array de fechas (cantidad = totalDates, validado en el esquema)
    participantIds, // Array de IDs de jugadores
    blindLevels, // Array de niveles de blinds
    totalDates, // Cantidad total de fechas (10-15, default 12)
    datesToEliminate // Fechas a eliminar del ranking (2-3, default 2)
  } = await parseBody(req, createTournamentSchema)

  // Verificar que el número no esté en uso
  const existingTournament = await prisma.tournament.findUnique({
    where: { number }
  })

  if (existingTournament) {
    throw AppError.badRequest(`Ya existe un torneo con el número ${number}`, 'TOURNAMENT_NUMBER_TAKEN')
  }

  // Verificar restricción de un solo torneo activo
  const activeTournament = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' }
  })

  // Solo se puede tener un torneo activo a la vez
  if (activeTournament) {
    throw AppError.badRequest(
      'Ya existe un torneo activo. Complete el torneo actual antes de crear uno nuevo.',
      'ACTIVE_TOURNAMENT_EXISTS'
    )
  }

  // Crear el torneo
  const tournament = await prisma.tournament.create({
    data: {
      name: `Torneo ${number}`,
      number,
      status: 'ACTIVO', // Los nuevos torneos se crean como activos
      participantIds,
      totalDates,
      datesToEliminate,
      gameDates: {
        create: gameDates.map((date, index) => ({
          dateNumber: index + 1,
          scheduledDate: parseToUTCNoon(date.scheduledDate),
          playersMin: 9,
          playersMax: 24
        }))
      },
      tournamentParticipants: {
        create: participantIds.map((playerId) => ({
          playerId,
          confirmed: false
        }))
      },
      blindLevels: {
        create: blindLevels || defaultBlindLevels()
      }
    },
    include: {
      gameDates: true,
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

  return ok(tournament, 201)
})
