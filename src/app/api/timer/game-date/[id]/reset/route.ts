import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { deriveLevelChangeUpdate } from '@/lib/timer-state'
import { emitTimerEvent } from '@/lib/server-socket'

/**
 * POST /api/timer/game-date/[id]/reset
 * Reinicia el tiempo del nivel ACTUAL con duración completa
 * Útil para testing: permite reiniciar el nivel sin perder progreso
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

      // Obtener el nivel actual de ciegas
      const currentBlindLevel = gameDate.tournament.blindLevels.find(bl => bl.level === timerState.currentLevel)
      if (!currentBlindLevel) {
        return NextResponse.json(
          { error: `No se encontró el nivel ${timerState.currentLevel} en el torneo` },
          { status: 400 }
        )
      }

      const newTimeRemaining = currentBlindLevel.duration * 60
      const updatePayload = deriveLevelChangeUpdate(timerState, timerState.currentLevel, newTimeRemaining)

      // Reiniciar el tiempo del nivel actual (sin cambiar totalElapsed)
      const updatedTimer = await prisma.timerState.update({
        where: { id: timerState.id },
        data: {
          ...updatePayload,
          status: 'active', // Reiniciar como activo
          // NO resetear totalElapsed - preservar historial
          levelStartTime: new Date(), // Nuevo tiempo de inicio del nivel
        }
      })

      // Registrar la acción
      await prisma.timerAction.create({
        data: {
          timerStateId: timerState.id,
          actionType: 'level_up',
          performedBy: user.id,
          fromLevel: timerState.currentLevel,
          toLevel: timerState.currentLevel,
          metadata: {
            action: 'reset_level',
            resetAt: new Date().toISOString(),
            level: timerState.currentLevel,
            newDuration: currentBlindLevel.duration,
            newSmallBlind: currentBlindLevel.smallBlind,
            newBigBlind: currentBlindLevel.bigBlind,
            timeRemaining: updatePayload.timeRemaining
          }
        }
      })

      const responseBody = {
        success: true,
        timerState: updatedTimer,
        blindLevel: currentBlindLevel,
        message: `Timer del nivel ${timerState.currentLevel} reiniciado exitosamente`
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
