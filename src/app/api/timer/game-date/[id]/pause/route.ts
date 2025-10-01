import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { derivePauseUpdate } from '@/lib/timer-state'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const gameDateId = parseInt((await params).id)
      
      if (isNaN(gameDateId)) {
        return NextResponse.json(
          { error: 'ID de fecha inválido' },
          { status: 400 }
        )
      }

      // Verificar que la fecha existe y está en progreso
      const gameDate = await prisma.gameDate.findUnique({
        where: { id: gameDateId }
      })

      if (!gameDate) {
        return NextResponse.json(
          { error: 'Fecha no encontrada' },
          { status: 404 }
        )
      }

      if (gameDate.status !== 'in_progress') {
        return NextResponse.json(
          { error: 'La fecha debe estar en progreso para pausar el timer' },
          { status: 400 }
        )
      }

      // Obtener el timer state actual
      const timerState = await prisma.timerState.findFirst({
        where: { gameDateId }
      })

      if (!timerState) {
        return NextResponse.json(
          { error: 'No se encontró el estado del timer' },
          { status: 404 }
        )
      }

      if (timerState.status === 'paused') {
        return NextResponse.json(
          { error: 'El timer ya está pausado' },
          { status: 400 }
        )
      }

      // Pausar el timer
      const updatePayload = derivePauseUpdate(timerState)

      const updatedTimer = await prisma.timerState.update({
        where: { id: timerState.id },
        data: updatePayload
      })

      // Registrar la acción
      await prisma.timerAction.create({
        data: {
          timerStateId: timerState.id,
          actionType: 'pause',
          performedBy: user.id,
          fromLevel: timerState.currentLevel,
          toLevel: timerState.currentLevel,
          metadata: {
            pausedAt: updatePayload.pausedAt?.toISOString(),
            timeRemaining: updatePayload.timeRemaining
          }
        }
      })

      return NextResponse.json({
        success: true,
        timerState: updatedTimer,
        message: 'Timer pausado exitosamente'
      })

    } catch (error) {
      console.error('[TIMER PAUSE ERROR]', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}
