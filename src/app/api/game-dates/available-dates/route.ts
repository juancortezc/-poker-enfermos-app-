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

      // Get all active players (Enfermos and Comision)
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
          isActive: true,
          aliases: true
        },
        orderBy: [
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      })

      // Get all players who have participated in any game date of this tournament
      const allGameDates = await prisma.gameDate.findMany({
        where: { tournamentId: activeTournament.id },
        select: { playerIds: true }
      })
      
      const participatingPlayerIds = new Set<string>()
      allGameDates.forEach(gd => {
        gd.playerIds.forEach(id => participatingPlayerIds.add(id))
      })

      // Get tournament participants for pre-selection
      const tournamentParticipantIds = new Set(
        activeTournament.tournamentParticipants
          .filter(tp => tp.player.isActive)
          .map(tp => tp.player.id)
      )

      // Mark players who should be pre-selected (tournament participants or have played in any date)
      const playersWithSelectionInfo = allActivePlayers.map(player => ({
        ...player,
        shouldPreselect: tournamentParticipantIds.has(player.id) || participatingPlayerIds.has(player.id)
      }))

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
        allPlayers: playersWithSelectionInfo,
        // Keep backward compatibility
        registeredPlayers: playersWithSelectionInfo.filter(p => p.shouldPreselect),
        additionalPlayers: []
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