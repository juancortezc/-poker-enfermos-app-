import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tournaments/active - Obtener el torneo activo actual (público)
export async function GET() {
  try {
      // Buscar primero torneo activo, si no existe, el más reciente
      let activeTournament = await prisma.tournament.findFirst({
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

      // Si no hay torneo activo, buscar el más reciente
      if (!activeTournament) {
        activeTournament = await prisma.tournament.findFirst({
          orderBy: { number: 'desc' },
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
      }

      if (!activeTournament) {
        return NextResponse.json({ tournament: null })
      }

      // Calcular estadísticas adicionales
      const completedDates = activeTournament.gameDates.filter(d => d.status === 'completed').length
      const nextDate = activeTournament.gameDates.find(d => d.status === 'pending' || d.status === 'CREATED')
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
}