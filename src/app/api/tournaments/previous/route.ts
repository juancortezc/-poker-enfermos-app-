import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tournaments/previous
 * Obtiene el último torneo FINALIZADO
 * Útil para mostrar resultados cuando el torneo activo aún no tiene datos
 */
export async function GET(_request: NextRequest) {
  try {
    // Buscar el torneo más reciente con estado FINALIZADO
    const previousTournament = await prisma.tournament.findFirst({
      where: { status: 'FINALIZADO' },
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
                photoUrl: true,
                aliases: true
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

    if (!previousTournament) {
      return NextResponse.json({ tournament: null }, { status: 404 })
    }

    // Calcular estadísticas
    const completedDates = previousTournament.gameDates.filter(
      d => d.status === 'completed'
    ).length

    return NextResponse.json({
      tournament: previousTournament,
      stats: {
        completedDates,
        totalDates: previousTournament.gameDates.length,
        isCompleted: true
      }
    })
  } catch (error) {
    console.error('Error fetching previous tournament:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneo anterior' },
      { status: 500 }
    )
  }
}
