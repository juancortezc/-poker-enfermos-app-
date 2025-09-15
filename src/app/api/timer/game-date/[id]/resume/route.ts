import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const gameDateId = parseInt(params.id)
      
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
          { error: 'La fecha debe estar en progreso para reanudar el timer' },
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

      if (timerState.status === 'active') {
        return NextResponse.json(
          { error: 'El timer ya está activo' },
          { status: 400 }
        )
      }

      // Reanudar el timer
      const updatedTimer = await prisma.timerState.update({
        where: { id: timerState.id },
        data: {
          status: 'active',
          levelStartTime: new Date(), // Reiniciar el tiempo de nivel
          pausedAt: null,
          lastUpdated: new Date()
        }
      })

      // Registrar la acción
      await prisma.timerAction.create({
        data: {
          timerStateId: timerState.id,
          actionType: 'resume',
          performedBy: user.id,
          fromLevel: timerState.currentLevel,
          toLevel: timerState.currentLevel,
          metadata: {
            resumedAt: new Date().toISOString(),
            timeRemaining: timerState.timeRemaining
          }
        }
      })

      return NextResponse.json({
        success: true,
        timerState: updatedTimer,
        message: 'Timer reanudado exitosamente'
      })

    } catch (error) {
      console.error('[TIMER RESUME ERROR]', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}