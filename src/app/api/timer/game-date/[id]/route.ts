import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const gameDateId = parseInt(params.id)
      
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

      // Obtener blind levels del torneo
      const blindLevels = gameDate.tournament.blindLevels

      // Encontrar el blind level actual y el siguiente
      const currentBlind = blindLevels.find(bl => bl.level === timerState.currentLevel)
      const nextBlind = blindLevels.find(bl => bl.level === timerState.currentLevel + 1)

      // Calcular tiempo restante en tiempo real si el timer está activo
      let actualTimeRemaining = timerState.timeRemaining
      
      if (timerState.status === 'active' && timerState.levelStartTime) {
        const now = new Date()
        const levelStartTime = new Date(timerState.levelStartTime)
        const elapsedSeconds = Math.floor((now.getTime() - levelStartTime.getTime()) / 1000)
        const totalDuration = (currentBlind?.duration || 0) * 60 // Convert minutes to seconds
        
        actualTimeRemaining = Math.max(0, totalDuration - elapsedSeconds)
      }

      return NextResponse.json({
        success: true,
        timerState: {
          ...timerState,
          timeRemaining: actualTimeRemaining
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
        isActive: timerState.status === 'active',
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