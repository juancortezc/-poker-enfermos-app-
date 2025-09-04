import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

// GET /api/tournaments/next - Obtener el próximo torneo en preparación
export async function GET(req: NextRequest) {
  return withAuth(req, async (req) => {
    try {
      const nextTournament = await prisma.tournament.findFirst({
        where: { status: 'PROXIMO' },
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

      if (!nextTournament) {
        return NextResponse.json({ tournament: null })
      }

      // Calcular estadísticas adicionales
      const startDate = nextTournament.gameDates[0]?.scheduledDate
      const endDate = nextTournament.gameDates[nextTournament.gameDates.length - 1]?.scheduledDate

      return NextResponse.json({
        tournament: nextTournament,
        stats: {
          startDate,
          endDate,
          totalParticipants: nextTournament._count.tournamentParticipants,
          totalDates: nextTournament.gameDates.length
        }
      })
    } catch (error) {
      console.error('Error fetching next tournament:', error)
      return NextResponse.json(
        { error: 'Error al obtener próximo torneo' },
        { status: 500 }
      )
    }
  })
}