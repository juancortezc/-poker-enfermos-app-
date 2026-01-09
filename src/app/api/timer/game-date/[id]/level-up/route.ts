import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { deriveLevelChangeUpdate } from '@/lib/timer-state'
import { emitTimerEvent } from '@/lib/server-socket'
import { getEcuadorDate } from '@/lib/date-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const gameDateId = parseInt((await params).id)
      const { toLevel } = await req.json()
      
      if (isNaN(gameDateId)) {
        return NextResponse.json(
          { error: 'ID de fecha inválido' },
          { status: 400 }
        )
      }

      if (!toLevel || toLevel < 1 || toLevel > 18) {
        return NextResponse.json(
          { error: 'Nivel inválido. Debe ser entre 1 y 18' },
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
          { error: 'La fecha debe estar en progreso para avanzar de nivel' },
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

      // Verificar que el nivel objetivo es válido
      const targetBlindLevel = gameDate.tournament.blindLevels.find(bl => bl.level === toLevel)
      if (!targetBlindLevel) {
        return NextResponse.json(
          { error: `Nivel ${toLevel} no encontrado en el torneo` },
          { status: 400 }
        )
      }

      if (toLevel <= timerState.currentLevel) {
        return NextResponse.json(
          { error: 'Solo se puede avanzar a un nivel superior' },
          { status: 400 }
        )
      }

      const newTimeRemaining = targetBlindLevel.duration * 60
      const updatePayload = deriveLevelChangeUpdate(timerState, toLevel, newTimeRemaining)

      const updatedTimer = await prisma.timerState.update({
        where: { id: timerState.id },
        data: {
          ...updatePayload,
          status: timerState.status // Mantener el estado actual (activo o pausado)
        }
      })

      // Registrar la acción
      await prisma.timerAction.create({
        data: {
          timerStateId: timerState.id,
          actionType: 'level_up',
          performedBy: user.id,
          fromLevel: timerState.currentLevel,
          toLevel: toLevel,
          metadata: {
            levelUpAt: getEcuadorDate().toISOString(),
            newDuration: targetBlindLevel.duration,
            newSmallBlind: targetBlindLevel.smallBlind,
            newBigBlind: targetBlindLevel.bigBlind,
            timeRemaining: updatePayload.timeRemaining
          }
        }
      })

      const responseBody = {
        success: true,
        timerState: updatedTimer,
        blindLevel: targetBlindLevel,
        message: `Avanzado al nivel ${toLevel} exitosamente`
      }

      await emitTimerEvent(gameDateId, 'timer-level-changed')

      return NextResponse.json(responseBody)

    } catch (error) {
      console.error('[TIMER LEVEL UP ERROR]', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}
