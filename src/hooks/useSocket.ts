'use client'

import { useEffect, useState } from 'react'
import { useSocketContext } from '@/contexts/SocketContext'

interface TimerState {
  status: 'inactive' | 'active' | 'paused'
  currentLevel: number
  performedBy?: string
  metadata?: Record<string, unknown>
  timestamp?: string
}

/**
 * Hook principal para acceder al socket.
 * Usa el SocketContext que maneja la conexión centralmente.
 */
export function useSocket() {
  const { socket, isConnected, transport, serverTimeOffset } = useSocketContext()

  return {
    socket,
    isConnected,
    transport,
    serverTimeOffset
  }
}

/**
 * Hook para suscribirse a eventos de timer de una fecha específica.
 */
export function useTimerSocket(gameDateId: number | null) {
  const { socket, isConnected, joinTimerRoom, leaveTimerRoom } = useSocketContext()
  const [timerState, setTimerState] = useState<TimerState | null>(null)

  useEffect(() => {
    if (!socket || !gameDateId) return

    // Unirse a la room del timer
    joinTimerRoom(gameDateId)

    const handleTimerStarted = (data: Partial<TimerState>) => {
      setTimerState((prev) => ({ ...prev, status: 'active', ...data } as TimerState))
    }

    const handleTimerPaused = (data: Partial<TimerState>) => {
      setTimerState((prev) => ({ ...prev, status: 'paused', ...data } as TimerState))
    }

    const handleTimerResumed = (data: Partial<TimerState>) => {
      setTimerState((prev) => ({ ...prev, status: 'active', ...data } as TimerState))
    }

    const handleTimerLevelChanged = (data: Partial<TimerState> & { toLevel: number }) => {
      setTimerState((prev) => ({ ...prev, currentLevel: data.toLevel, ...data } as TimerState))
    }

    socket.on('timer-started', handleTimerStarted)
    socket.on('timer-paused', handleTimerPaused)
    socket.on('timer-resumed', handleTimerResumed)
    socket.on('timer-level-changed', handleTimerLevelChanged)

    return () => {
      socket.off('timer-started', handleTimerStarted)
      socket.off('timer-paused', handleTimerPaused)
      socket.off('timer-resumed', handleTimerResumed)
      socket.off('timer-level-changed', handleTimerLevelChanged)
      leaveTimerRoom(gameDateId)
    }
  }, [socket, gameDateId, joinTimerRoom, leaveTimerRoom])

  const emitTimerAction = (action: string, metadata?: Record<string, unknown>) => {
    if (!socket || !gameDateId) return

    socket.emit(`timer-${action}`, {
      gameDateId,
      performedBy: 'current-user-id', // TODO: get from auth context
      metadata
    })
  }

  return {
    socket,
    isConnected,
    timerState,
    startTimer: (metadata?: Record<string, unknown>) => emitTimerAction('start', metadata),
    pauseTimer: (metadata?: Record<string, unknown>) => emitTimerAction('pause', metadata),
    resumeTimer: (metadata?: Record<string, unknown>) => emitTimerAction('resume', metadata),
    levelUp: (fromLevel: number, toLevel: number) =>
      socket?.emit('timer-level-up', { gameDateId, fromLevel, toLevel, performedBy: 'current-user-id' })
  }
}
