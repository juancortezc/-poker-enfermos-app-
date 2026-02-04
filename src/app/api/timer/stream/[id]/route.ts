import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeTimerState, deriveLevelChangeUpdate } from '@/lib/timer-state'
import { getEcuadorDate } from '@/lib/date-utils'
import { broadcastPushNotification } from '@/lib/push-service'

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface TimerStreamData {
  serverTime: number
  status: 'active' | 'paused' | 'inactive' | 'completed'
  currentLevel: number
  timeRemaining: number
  totalElapsed: number
  smallBlind: number
  bigBlind: number
  nextSmallBlind: number | null
  nextBigBlind: number | null
  nextLevel: number | null
  gameDateId: number
  tournamentName: string
  dateNumber: number
}

async function getTimerData(gameDateId: number): Promise<TimerStreamData | null> {
  const gameDate = await prisma.gameDate.findUnique({
    where: { id: gameDateId },
    include: {
      tournament: {
        include: {
          blindLevels: {
            orderBy: { level: 'asc' }
          }
        }
      },
      timerState: true
    }
  })

  if (!gameDate) {
    return null
  }

  // Handle completed or non-active game dates
  if (gameDate.status === 'completed' || !gameDate.timerState) {
    const blindLevels = gameDate.tournament.blindLevels
    const lastBlind = blindLevels[blindLevels.length - 1]

    return {
      serverTime: Date.now(),
      status: 'completed',
      currentLevel: lastBlind?.level ?? 1,
      timeRemaining: 0,
      totalElapsed: 0,
      smallBlind: lastBlind?.smallBlind ?? 0,
      bigBlind: lastBlind?.bigBlind ?? 0,
      nextSmallBlind: null,
      nextBigBlind: null,
      nextLevel: null,
      gameDateId: gameDate.id,
      tournamentName: `Torneo ${gameDate.tournament.number}`,
      dateNumber: gameDate.dateNumber
    }
  }

  const timerState = gameDate.timerState
  const computed = computeTimerState(timerState)
  const blindLevels = gameDate.tournament.blindLevels

  const currentBlind = blindLevels.find(bl => bl.level === computed.currentLevel)
  const nextBlind = blindLevels.find(bl => bl.level === computed.currentLevel + 1)

  return {
    serverTime: Date.now(),
    status: computed.status,
    currentLevel: computed.currentLevel,
    timeRemaining: computed.timeRemaining,
    totalElapsed: computed.totalElapsed,
    smallBlind: currentBlind?.smallBlind ?? 0,
    bigBlind: currentBlind?.bigBlind ?? 0,
    nextSmallBlind: nextBlind?.smallBlind ?? null,
    nextBigBlind: nextBlind?.bigBlind ?? null,
    nextLevel: nextBlind?.level ?? null,
    gameDateId: gameDate.id,
    tournamentName: `Torneo ${gameDate.tournament.number}`,
    dateNumber: gameDate.dateNumber
  }
}

async function autoAdvanceLevel(gameDateId: number, toLevel: number): Promise<boolean> {
  try {
    const gameDate = await prisma.gameDate.findUnique({
      where: { id: gameDateId },
      include: {
        tournament: {
          include: {
            blindLevels: {
              orderBy: { level: 'asc' }
            }
          }
        },
        timerState: true
      }
    })

    if (!gameDate || !gameDate.timerState) return false
    if (gameDate.status !== 'in_progress') return false

    const timerState = gameDate.timerState
    if (timerState.status !== 'active') return false

    const targetBlindLevel = gameDate.tournament.blindLevels.find(bl => bl.level === toLevel)
    if (!targetBlindLevel) return false
    if (toLevel <= timerState.currentLevel) return false

    const newTimeRemaining = targetBlindLevel.duration * 60
    const updatePayload = deriveLevelChangeUpdate(timerState, toLevel, newTimeRemaining)

    await prisma.timerState.update({
      where: { id: timerState.id },
      data: {
        ...updatePayload,
        status: 'active'
      }
    })

    // Registrar la acción (auto-advance)
    await prisma.timerAction.create({
      data: {
        timerStateId: timerState.id,
        actionType: 'level_up',
        performedBy: null, // Sistema automático
        fromLevel: timerState.currentLevel,
        toLevel: toLevel,
        metadata: {
          levelUpAt: getEcuadorDate().toISOString(),
          newDuration: targetBlindLevel.duration,
          newSmallBlind: targetBlindLevel.smallBlind,
          newBigBlind: targetBlindLevel.bigBlind,
          timeRemaining: newTimeRemaining,
          autoAdvance: true
        }
      }
    })

    // Enviar notificación push
    await broadcastPushNotification(
      {
        title: 'Cambio de Blind',
        body: `Nivel ${toLevel}: ${targetBlindLevel.smallBlind}/${targetBlindLevel.bigBlind}`,
        tag: `blind-change-${gameDateId}-${toLevel}`,
        url: '/home',
        data: {
          type: 'blind_change',
          gameDateId,
          level: toLevel,
          smallBlind: targetBlindLevel.smallBlind,
          bigBlind: targetBlindLevel.bigBlind
        }
      },
      { targetRoles: ['Comision', 'Enfermo'] }
    ).catch(err => console.error('Failed to send blind change notification:', err))

    console.log(`[SSE Timer] Auto-avanzado a nivel ${toLevel} para gameDate ${gameDateId}`)
    return true
  } catch (error) {
    console.error('[SSE Timer] Error en auto-advance:', error)
    return false
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gameDateId = parseInt((await params).id)

  if (isNaN(gameDateId)) {
    return new Response('ID inválido', { status: 400 })
  }

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let isAborted = false
  let lastAdvancedLevel = 0

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = async () => {
        if (isAborted) return

        try {
          const data = await getTimerData(gameDateId)

          if (!data) {
            const errorEvent = `data: ${JSON.stringify({ error: 'Timer no encontrado' })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            return
          }

          // Auto-avance cuando timeRemaining llega a 0
          if (
            data.status === 'active' &&
            data.timeRemaining === 0 &&
            data.nextLevel &&
            lastAdvancedLevel !== data.currentLevel
          ) {
            lastAdvancedLevel = data.currentLevel
            const advanced = await autoAdvanceLevel(gameDateId, data.nextLevel)
            if (advanced) {
              // Obtener datos actualizados después del avance
              const updatedData = await getTimerData(gameDateId)
              if (updatedData) {
                const event = `data: ${JSON.stringify(updatedData)}\n\n`
                controller.enqueue(encoder.encode(event))
                return
              }
            }
          }

          const event = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(event))
        } catch (error) {
          console.error('[SSE Timer] Error:', error)
          if (!isAborted) {
            const errorEvent = `data: ${JSON.stringify({ error: 'Error interno' })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
          }
        }
      }

      // Enviar estado inicial inmediatamente
      await sendEvent()

      // Enviar actualizaciones cada segundo
      intervalId = setInterval(sendEvent, 1000)

      // Manejar cierre de conexión
      request.signal.addEventListener('abort', () => {
        isAborted = true
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
        try {
          controller.close()
        } catch {
          // Controller may already be closed
        }
      })
    },

    cancel() {
      isAborted = true
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
