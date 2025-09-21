import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, _user) => {
    try {
      // FIRST: Check if there are any CREATED or in_progress dates
      // If so, block all date creation
      const activeOrCreatedDate = await prisma.gameDate.findFirst({
        where: {
          status: {
            in: ['CREATED', 'in_progress']
          }
        }
      })

      // If there's an active or created date, return empty available dates
      if (activeOrCreatedDate) {
        console.log('🚫 Blocking date creation - found active date:', {
          dateNumber: activeOrCreatedDate.dateNumber,
          status: activeOrCreatedDate.status
        })
        
        return NextResponse.json({
          tournament: null,
          availableDates: [], // Empty - no dates can be created
          registeredPlayers: [],
          additionalPlayers: [],
          blocked: true,
          blockedReason: `Existe una fecha ${activeOrCreatedDate.dateNumber} en estado ${activeOrCreatedDate.status}`,
          activeDate: {
            dateNumber: activeOrCreatedDate.dateNumber,
            status: activeOrCreatedDate.status
          }
        })
      }

      // Obtener el torneo activo
      const activeTournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVO' },
        include: {
          gameDates: {
            where: {
              status: {
                notIn: ['completed', 'CREATED', 'in_progress']  // Only allow pending dates when no active dates exist
              }
            },
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
                  isActive: true
                }
              }
            }
          }
        }
      })

      if (!activeTournament) {
        return NextResponse.json(
          { error: 'No hay torneo activo' },
          { status: 404 }
        )
      }

      // Get all active players for additional selection
      const allActivePlayers = await prisma.player.findMany({
        where: {
          isActive: true,
          OR: [
            { role: 'Comision' },
            { role: 'Enfermo' }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          photoUrl: true,
          isActive: true
        }
      })

      const registeredPlayers = activeTournament.tournamentParticipants
        .filter(tp => tp.player.isActive)
        .map(tp => tp.player)

      // Get players not registered in tournament
      const registeredPlayerIds = registeredPlayers.map(p => p.id)
      const availableAdditionalPlayers = allActivePlayers.filter(p => !registeredPlayerIds.includes(p.id))

      // Map available game dates for dropdown
      const availableDates = activeTournament.gameDates.map(gd => ({
        dateNumber: gd.dateNumber,
        scheduledDate: gd.scheduledDate.toISOString().split('T')[0],
        status: gd.status,
        id: gd.id
      }))

      return NextResponse.json({
        tournament: {
          id: activeTournament.id,
          name: activeTournament.name,
          number: activeTournament.number
        },
        availableDates: availableDates,
        registeredPlayers: registeredPlayers,
        additionalPlayers: availableAdditionalPlayers
      })
    } catch (error) {
      console.error('Error getting available game dates:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}