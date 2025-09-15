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

      // Calcular nuevo tiempo restante basado en la duración del nuevo nivel
      const newTimeRemaining = targetBlindLevel.duration * 60 // convertir minutos a segundos

      // Actualizar el timer state
      const updatedTimer = await prisma.timerState.update({
        where: { id: timerState.id },
        data: {
          currentLevel: toLevel,
          timeRemaining: newTimeRemaining,
          levelStartTime: new Date(),
          updatedAt: new Date()
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
            levelUpAt: new Date().toISOString(),
            newDuration: targetBlindLevel.duration,
            newSmallBlind: targetBlindLevel.smallBlind,
            newBigBlind: targetBlindLevel.bigBlind
          }
        }
      })

      return NextResponse.json({
        success: true,
        timerState: updatedTimer,
        blindLevel: targetBlindLevel,
        message: `Avanzado al nivel ${toLevel} exitosamente`
      })

    } catch (error) {
      console.error('[TIMER LEVEL UP ERROR]', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  })
}