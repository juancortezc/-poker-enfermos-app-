import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseQuery } from '@/lib/http'
import { availableGuestsQuerySchema, compareGuestsByRecency } from '@poker/shared'
import { GUEST_SELECT, withLastPlayed } from '@/lib/guests'

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

    // Invitados externos, por participacion mas reciente (lastPlayedAt). Los
    // comodines "Invitado 1 S/N" los separa el cliente (groupExternalGuests).
    const externalRows = await prisma.player.findMany({
      where: {
        role: 'Invitado',
        isActive: true
      },
      select: GUEST_SELECT
    })
    const externalGuests = (await withLastPlayed(prisma, externalRows)).sort(compareGuestsByRecency)

    return ok({
      groupMembers,
      externalGuests
    })
  })
})