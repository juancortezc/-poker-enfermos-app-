import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { deriveLevelChangeUpdate } from '@/lib/timer-state'
import { emitTimerEvent } from '@/lib/server-socket'

/**
 * POST /api/timer/game-date/[id]/reset
 * Reinicia el timer al nivel 1 con tiempo completo
 * Solo para usuarios de Comisión
 */
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

      if (gameDate.status !== 'in_progress') {
        return NextResponse.json(
          { error: 'La fecha debe estar en progreso para reiniciar el timer' },
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

      // Obtener el primer nivel de ciegas
      const firstBlindLevel = gameDate.tournament.blindLevels.find(bl => bl.level === 1)
      if (!firstBlindLevel) {
        return NextResponse.json(
          { error: 'No se encontró el nivel 1 en el torneo' },
          { status: 400 }
        )
      }

      const newTimeRemaining = firstBlindLevel.duration * 60
      const updatePayload = deriveLevelChangeUpdate(timerState, 1, newTimeRemaining)

      // Reiniciar el timer al nivel 1
      const updatedTimer = await prisma.timerState.update({
        where: { id: timerState.id },
        data: {
          ...updatePayload,
          status: 'active', // Reiniciar como activo
          totalElapsed: 0, // Resetear tiempo total
          startTime: new Date(), // Nuevo tiempo de inicio
        }
      })

      // Registrar la acción
      await prisma.timerAction.create({
        data: {
          timerStateId: timerState.id,
          actionType: 'level_up',
          performedBy: user.id,
          fromLevel: timerState.currentLevel,
          toLevel: 1,
          metadata: {
            action: 'reset',
            resetAt: new Date().toISOString(),
            previousLevel: timerState.currentLevel,
            newDuration: firstBlindLevel.duration,
            newSmallBlind: firstBlindLevel.smallBlind,
            newBigBlind: firstBlindLevel.bigBlind,
            timeRemaining: updatePayload.timeRemaining
          }
        }
      })

      const responseBody = {
        success: true,
        timerState: updatedTimer,
        blindLevel: firstBlindLevel,
        message: 'Timer reiniciado al nivel 1 exitosamente'
      }

      await emitTimerEvent(gameDateId, 'timer-started')

      return NextResponse.json(responseBody)

    } catch (error) {
      console.error('[TIMER RESET ERROR]', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}
