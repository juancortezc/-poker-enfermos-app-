import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseQuery } from '@/lib/http'
import { availableGuestsQuerySchema } from '@poker/shared'

export const GET = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req) => {
    const { tournamentId } = parseQuery(req, availableGuestsQuerySchema)
    
    let registeredPlayerIds: string[] = []
    
    // If tournament ID is provided, exclude registered players
    if (tournamentId) {
      // Obtener participantes registrados en el torneo
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          tournamentParticipants: {
            select: {
              player: {
                select: { id: true }
              }
            }
          }
        }
      })

      if (!tournament) {
        throw AppError.notFound('Torneo no encontrado', 'TOURNAMENT_NOT_FOUND')
      }

      registeredPlayerIds = tournament.tournamentParticipants.map(
        tp => tp.player.id
      )
    }

    // Obtener jugadores del grupo (excluding registered players if tournament provided)
    const groupMembers = await prisma.player.findMany({
      where: {
        isActive: true,
        role: {
          in: ['Enfermo', 'Comision']
        },
        ...(registeredPlayerIds.length > 0 && {
          id: {
            notIn: registeredPlayerIds
          }
        })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        photoUrl: true
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    })

    // Obtener invitados externos
    const externalGuests = await prisma.player.findMany({
      where: {
        role: 'Invitado',
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        photoUrl: true,
        inviter: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' }
      ]
    })

    return ok({
      groupMembers,
      externalGuests
    })
  })
})