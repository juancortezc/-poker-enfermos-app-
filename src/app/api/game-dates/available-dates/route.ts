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
          blockedDate: {
            id: activeOrCreatedDate.id,
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

      // Check for missing dates (deleted dates that need to be recreated)
      // Get all dates for this tournament to find gaps
      const allTournamentDates = await prisma.gameDate.findMany({
        where: { tournamentId: activeTournament.id },
        select: { dateNumber: true, status: true },
        orderBy: { dateNumber: 'asc' }
      })

      const existingDateNumbers = allTournamentDates.map(d => d.dateNumber)
      const completedDates = allTournamentDates.filter(d => d.status === 'completed')
      const maxCompletedDate = completedDates.length > 0
        ? Math.max(...completedDates.map(d => d.dateNumber))
        : 0

      // Find the next date that should be playable
      // It's either: a pending date, OR the next date after completed ones that's missing
      const nextExpectedDate = maxCompletedDate + 1
      const missingDate = !existingDateNumbers.includes(nextExpectedDate) && nextExpectedDate <= 12
        ? nextExpectedDate
        : null

      return NextResponse.json({
        tournament: {
          id: activeTournament.id,
          name: activeTournament.name,
          number: activeTournament.number
        },
        availableDates: availableDates,
        registeredPlayers: registeredPlayers,
        additionalPlayers: availableAdditionalPlayers,
        missingDate: missingDate // Date number that needs to be recreated
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