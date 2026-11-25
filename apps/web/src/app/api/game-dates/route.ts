import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createGameDateSchema } from '@poker/shared'
import { requireComision } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseBody } from '@/lib/http'

// POST - Crear nueva fecha de juego
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request)
  // tournamentId y dateNumber llegan como numero o texto; el esquema los deja en numero.
  const {
    tournamentId,
    dateNumber,
    scheduledDate,
    playerIds,
    guestIds
  } = await parseBody(request, createGameDateSchema)

  // Verificar que existe la fecha para actualizar
  const existingDate = await prisma.gameDate.findFirst({
    where: {
      tournamentId,
      dateNumber
    }
  })

  // Calcular puntos para el ganador basado en número de participantes
  const totalParticipants = playerIds.length + guestIds.length
  const pointsForWinner = calculateWinnerPoints(totalParticipants)

  let gameDate

  if (!existingDate) {
    // Date doesn't exist - recreate it (was deleted)
    // Parse the scheduled date properly
    const parsedDate = new Date(scheduledDate.length === 10 ? scheduledDate + 'T12:00:00.000Z' : scheduledDate)

    gameDate = await prisma.gameDate.create({
      data: {
        tournamentId,
        dateNumber,
        scheduledDate: parsedDate,
        playerIds: playerIds,
        status: 'CREATED',
        playersMin: Math.min(9, totalParticipants),
        playersMax: Math.max(24, totalParticipants)
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        }
      }
    })
  } else {
    if (existingDate.status !== 'pending') {
      throw AppError.badRequest(
        `La fecha ${dateNumber} ya ha sido activada (estado: ${existingDate.status})`,
        'GAME_DATE_ALREADY_ACTIVATED'
      )
    }

    // Actualizar la fecha de juego existente
    gameDate = await prisma.gameDate.update({
      where: {
        id: existingDate.id
      },
      data: {
        playerIds: playerIds,
        status: 'CREATED', // Configurada y lista para usar
        playersMin: Math.min(9, totalParticipants),
        playersMax: Math.max(24, totalParticipants)
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        }
      }
    })
  }

  return ok({
    gameDate: {
      ...gameDate,
      guestIds,
      totalParticipants,
      pointsForWinner
    }
  })
})

// Función para calcular puntos del ganador
function calculateWinnerPoints(totalParticipants: number): number {
  // Tabla de puntuación basada en el PDF del torneo
  if (totalParticipants >= 20) return 25
  if (totalParticipants >= 16) return 22
  if (totalParticipants >= 12) return 20
  if (totalParticipants >= 9) return 18
  return 15 // Mínimo
}