import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { computeTimerState } from '@/lib/timer-state'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const gameDateId = parseInt((await params).id)
      
      if (isNaN(gameDateId)) {
        return NextResponse.json(
          { error: 'ID de fecha inválido' },
          { status: 400 }
        )
      }

      // Verificar que la fecha existe
      const gameDate = await prisma.gameDate.findUnique({
        where: { id: gameDateId },
        include: {
          tournament: {
            include: {
              blindLevels: {
                orderBy: { level: 'asc' }
              }
            }
          }
        }
      })

      if (!gameDate) {
        return NextResponse.json(
          { error: 'Fecha no encontrada' },
          { status: 404 }
        )
      }

      // Obtener el timer state actual
      const timerState = await prisma.timerState.findFirst({
        where: { gameDateId },
        include: {
          timerActions: {
            orderBy: { performedAt: 'desc' },
            take: 10
          }
        }
      })

      if (!timerState) {
        return NextResponse.json(
          { error: 'No se encontró el estado del timer' },
          { status: 404 }
        )
      }

      const blindLevels = gameDate.tournament.blindLevels
      const currentBlind = blindLevels.find(bl => bl.level === timerState.currentLevel) || null
      const nextBlind = blindLevels.find(bl => bl.level === timerState.currentLevel + 1) || null

      const computed = computeTimerState(timerState)

      return NextResponse.json({
        success: true,
        timerState: {
          ...timerState,
          timeRemaining: computed.timeRemaining,
          totalElapsed: computed.totalElapsed,
          status: computed.status,
          levelStartTime: computed.levelStartTime,
          startTime: computed.startTime
        },
        currentBlind,
        nextBlind,
        tournament: {
          id: gameDate.tournament.id,
          name: `Torneo ${gameDate.tournament.number}`
        },
        gameDate: {
          id: gameDate.id,
          dateNumber: gameDate.dateNumber,
          status: gameDate.status
        },
        isActive: computed.status === 'active',
        canControl: user.role === 'Comision'
      })

    } catch (error) {
      console.error('[TIMER GET ERROR]', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}
