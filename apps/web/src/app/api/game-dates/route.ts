import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createGameDateSchema, gameDateParticipantIds } from '@poker/shared'
import { assertPlayersExist } from '@/lib/data-integrity'
import { parseToUTCNoon } from '@/lib/date-utils'
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

  // Sin repetidos (el esquema ya rechaza los de una misma lista) y todos
  // existentes: un id repetido o inventado inflaba el conteo y los puntos.
  const participantIds = gameDateParticipantIds(playerIds, guestIds)
  await assertPlayersExist(prisma, participantIds)

  // Verificar que existe la fecha para actualizar
  const existingDate = await prisma.gameDate.findFirst({
    where: {
      tournamentId,
      dateNumber
    }
  })

  // Calcular puntos para el ganador basado en número de participantes
  const totalParticipants = participantIds.length
  const pointsForWinner = calculateWinnerPoints(totalParticipants)

  let gameDate

  if (!existingDate) {
    // Date doesn't exist - recreate it (was deleted)
    // Mediodía UTC del día calendario recibido, venga 'YYYY-MM-DD' o ISO:
    // un ISO a las 00:00 UTC se guardaba tal cual y en Ecuador era el día
    // anterior.
    const parsedDate = parseToUTCNoon(scheduledDate)

    gameDate = await prisma.gameDate.create({
      data: {
        tournamentId,
        dateNumber,
        scheduledDate: parsedDate,
        playerIds: participantIds,
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
        playerIds: participantIds,
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