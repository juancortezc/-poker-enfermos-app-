import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// GET /api/tournaments/active - Obtener el torneo activo actual
export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
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
                  photoUrl: true
                }
              }
            }
          },
          blindLevels: {
            orderBy: { level: 'asc' }
          },
          _count: {
            select: {
              tournamentParticipants: true,
              gameDates: true
            }
          }
        }
      })

      if (!activeTournament) {
        return NextResponse.json({ tournament: null })
      }

      // Calcular estadísticas adicionales
      const completedDates = activeTournament.gameDates.filter(d => d.status === 'completed').length
      const nextDate = activeTournament.gameDates.find(d => d.status === 'CREATED')
      const startDate = activeTournament.gameDates[0]?.scheduledDate
      const endDate = activeTournament.gameDates[activeTournament.gameDates.length - 1]?.scheduledDate

      return NextResponse.json({
        tournament: activeTournament,
        stats: {
          completedDates,
          totalDates: activeTournament.gameDates.length,
          nextDate,
          startDate,
          endDate,
          isCompleted: completedDates === activeTournament.gameDates.length
        }
      })
    } catch (error) {
      console.error('Error fetching active tournament:', error)
      return NextResponse.json(
        { error: 'Error al obtener torneo activo' },
        { status: 500 }
      )
    }
  })
}