import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Obtener el torneo activo
      const activeTournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVO' },
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

      // Buscar la próxima fecha disponible (que no tenga GameDate creado aún)
      const existingGameDates = activeTournament.gameDates.map(gd => gd.dateNumber)
      let nextDateNumber = 1
      
      // Encontrar el primer número de fecha que no existe
      while (existingGameDates.includes(nextDateNumber)) {
        nextDateNumber++
      }

      if (nextDateNumber > 12) {
        return NextResponse.json(
          { error: 'Todas las fechas del torneo ya están creadas' },
          { status: 400 }
        )
      }

      // Obtener la fecha programada desde el torneo
      const scheduledGameDate = activeTournament.gameDates.find(
        gd => gd.dateNumber === nextDateNumber
      )

      // Si no existe en la tabla gameDates, obtener de la definición del torneo
      let scheduledDate
      if (scheduledGameDate) {
        scheduledDate = scheduledGameDate.scheduledDate
      } else {
        // Buscar en las fechas programadas del torneo
        // Por ahora, usar fecha actual + días para el siguiente martes
        const today = new Date()
        const daysUntilTuesday = (2 + 7 - today.getDay()) % 7
        scheduledDate = new Date(today)
        scheduledDate.setDate(today.getDate() + daysUntilTuesday + ((nextDateNumber - 1) * 15))
      }

      return NextResponse.json({
        tournament: {
          id: activeTournament.id,
          name: activeTournament.name,
          number: activeTournament.number
        },
        nextDate: {
          dateNumber: nextDateNumber,
          scheduledDate: scheduledDate
        },
        registeredPlayers: activeTournament.tournamentParticipants
          .filter(tp => tp.player.isActive)
          .map(tp => tp.player)
      })
    } catch (error) {
      console.error('Error getting next available game date:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}