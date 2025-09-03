import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Buscar fecha activa (con status diferente a completed)
      const activeGameDate = await prisma.gameDate.findFirst({
        where: {
          OR: [
            { status: 'pending' },
            { status: 'active' }
          ]
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
        return NextResponse.json({ activeDate: null })
      }

      return NextResponse.json({ 
        activeDate: {
          id: activeGameDate.id,
          dateNumber: activeGameDate.dateNumber,
          scheduledDate: activeGameDate.scheduledDate,
          status: activeGameDate.status,
          playerIds: activeGameDate.playerIds,
          tournament: activeGameDate.tournament,
          playersCount: activeGameDate.playerIds.length
        }
      })
    } catch (error) {
      console.error('Error getting active game date:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}