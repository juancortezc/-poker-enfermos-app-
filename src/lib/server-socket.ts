import type { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { prisma } from '@/lib/prisma'
import { computeTimerState } from '@/lib/timer-state'

declare global {
  var __socketServer: SocketIOServer | undefined
}

const TIMER_ROOM_PREFIX = 'timer:'

const getTimerRoom = (gameDateId: number) => `${TIMER_ROOM_PREFIX}${gameDateId}`

export function getSocketServer(): SocketIOServer | null {
  return global.__socketServer ?? null
}

export function initSocketServer(server: HTTPServer): SocketIOServer {
  if (global.__socketServer) {
    return global.__socketServer
  }

  const io = new SocketIOServer(server, {
    transports: ['websocket', 'polling']
  })

  io.on('connection', (socket: Socket) => {
    socket.on('join-timer', (gameDateId: number) => {
      if (!gameDateId) return
      socket.join(getTimerRoom(gameDateId))
    })

    socket.on('leave-timer', (gameDateId: number) => {
      if (!gameDateId) return
      socket.leave(getTimerRoom(gameDateId))
    })

    // Sincronización de tiempo servidor-cliente
    socket.on('sync-time', (data: { clientTime: number }) => {
      socket.emit('time-sync', {
        serverTime: Date.now(),
        clientTime: data.clientTime
      })
    })
  })

  global.__socketServer = io
  return io
}

interface TimerBroadcastPayload {
  gameDateId: number
  serverTime: number // Timestamp del servidor para sincronización
  timerState: ReturnType<typeof computeTimerState>
  currentBlind: {
    level: number
    smallBlind: number
    bigBlind: number
    duration: number
    timeRemaining: number
  } | null
  nextBlind: {
    level: number
    smallBlind: number
    bigBlind: number
    duration: number
  } | null
}

export async function emitTimerState(gameDateId: number) {
  const io = getSocketServer()
  if (!io) return

  const [timerState, gameDate] = await Promise.all([
    prisma.timerState.findUnique({ where: { gameDateId } }),
    prisma.gameDate.findUnique({
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
  ])

  if (!timerState || !gameDate) return

  const computed = computeTimerState(timerState)
  const blindLevels = gameDate.tournament.blindLevels
  const currentBlind = blindLevels.find(bl => bl.level === computed.currentLevel) || null
  const nextBlind = currentBlind
    ? blindLevels.find(bl => bl.level === currentBlind.level + 1) || null
    : null

  const payload: TimerBroadcastPayload = {
    gameDateId,
    serverTime: Date.now(),
    timerState: computed,
    currentBlind: currentBlind
      ? {
          level: currentBlind.level,
          smallBlind: currentBlind.smallBlind,
          bigBlind: currentBlind.bigBlind,
          duration: currentBlind.duration,
          timeRemaining: computed.timeRemaining
        }
      : null,
    nextBlind: nextBlind
      ? {
          level: nextBlind.level,
          smallBlind: nextBlind.smallBlind,
          bigBlind: nextBlind.bigBlind,
          duration: nextBlind.duration
        }
      : null
  }

  io.to(getTimerRoom(gameDateId)).emit('timer-state', payload)
}

export async function emitTimerEvent(
  gameDateId: number,
  event: 'timer-paused' | 'timer-resumed' | 'timer-level-changed' | 'timer-started'
) {
  const io = getSocketServer()
  if (!io) return

  await emitTimerState(gameDateId)
  io.to(getTimerRoom(gameDateId)).emit(event, { gameDateId, emittedAt: new Date().toISOString() })
}
