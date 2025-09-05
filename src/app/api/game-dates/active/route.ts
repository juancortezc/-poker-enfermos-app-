import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Buscar fecha activa (solo in_progress para el botón de registro)
    const activeGameDate = await prisma.gameDate.findFirst({
      where: {
        status: 'in_progress'
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
      orderBy: {
        dateNumber: 'asc'
      }
    })

    if (!activeGameDate) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: activeGameDate.id,
      dateNumber: activeGameDate.dateNumber,
      scheduledDate: activeGameDate.scheduledDate,
      status: activeGameDate.status,
      playerIds: activeGameDate.playerIds,
      tournament: activeGameDate.tournament,
      playersCount: activeGameDate.playerIds.length
    })
  } catch (error) {
    console.error('Error getting active game date:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}