import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, _user) => {
    try {
      // Obtener el torneo activo
      const activeTournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVO' },
        include: {
          gameDates: {
            where: {
              status: {
                notIn: ['completed', 'CREATED']  // Excluir fechas completadas y ya configuradas
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