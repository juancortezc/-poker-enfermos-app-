import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

export const GET = withErrorHandler(async () => {
  // Solo participantes registrados para T29
  const participants = await prisma.t29Participant.findMany({
    orderBy: { registeredAt: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      registeredAt: true,
      player: {
        select: {
          id: true,
          photoUrl: true
        }
      }
    }
  })

  const count = participants.length

  return ok({
    participants,
    count
  })
})

// POST - Registrar participación en T29
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (_, user) => {
    // Verificar si el usuario ya está registrado
    const existingParticipant = await prisma.t29Participant.findUnique({
      where: { playerId: user.id }
    })

    if (existingParticipant) {
      throw AppError.conflict('Ya estás registrado para participar en T29', 'ALREADY_REGISTERED')
    }

    // Crear nuevo participante
    const participant = await prisma.t29Participant.create({
      data: {
        playerId: user.id,
        firstName: user.firstName,
        lastName: user.lastName
      }
    })

    return ok({
      participant,
      message: 'Registrado exitosamente para T29'
    }, 201)
  })
})