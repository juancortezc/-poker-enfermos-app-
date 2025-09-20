import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    // Buscar fecha configurada o activa (CREATED o in_progress)
    // Esto incluye fechas listas para iniciar y fechas ya iniciadas
    const configuredOrActiveGameDate = await prisma.gameDate.findFirst({
      where: {
        status: {
          in: ['CREATED', 'in_progress']
        }
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            number: true
          }
        }
      },
      orderBy: [
        // Priorizar fechas in_progress sobre CREATED
        { status: 'desc' },
        { dateNumber: 'asc' }
      ]
    })

    if (!configuredOrActiveGameDate) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: configuredOrActiveGameDate.id,
      dateNumber: configuredOrActiveGameDate.dateNumber,
      scheduledDate: configuredOrActiveGameDate.scheduledDate,
      status: configuredOrActiveGameDate.status,
      playerIds: configuredOrActiveGameDate.playerIds,
      tournament: configuredOrActiveGameDate.tournament,
      playersCount: configuredOrActiveGameDate.playerIds.length,
      // Indicadores útiles para el frontend
      isConfigured: configuredOrActiveGameDate.status === 'CREATED',
      isInProgress: configuredOrActiveGameDate.status === 'in_progress'
    })
  } catch (error) {
    console.error('Error getting configured or active game date:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}