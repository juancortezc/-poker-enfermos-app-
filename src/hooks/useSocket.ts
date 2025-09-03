'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface TimerState {
  status: 'inactive' | 'active' | 'paused'
  currentLevel: number
  performedBy?: string
  metadata?: Record<string, unknown>
  timestamp?: string
}


let socket: Socket | null = null

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState('N/A')

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_SITE_URL || '' 
        : 'http://localhost:3000'
      )
    }

    function onConnect() {
      setIsConnected(true)
      setTransport(socket?.io.engine.transport.name || 'N/A')

      socket?.io.engine.on('upgrade', () => {
        setTransport(socket?.io.engine.transport.name || 'N/A')
      })
    }

    function onDisconnect() {
      setIsConnected(false)
      setTransport('N/A')
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket?.off('connect', onConnect)
      socket?.off('disconnect', onDisconnect)
    }
  }, [])

  return {
    socket,
    isConnected,
    transport
  }
}

export function useTimerSocket(gameDateId: number | null) {
  const { socket, isConnected } = useSocket()
  const [timerState, setTimerState] = useState<TimerState | null>(null)

  useEffect(() => {
    if (!socket || !gameDateId) return

    socket.emit('join-timer', gameDateId)

    const handleTimerStarted = (data: Partial<TimerState>) => {
      console.log('Timer started:', data)
      setTimerState((prev) => ({ ...prev, status: 'active', ...data } as TimerState))
    }

    const handleTimerPaused = (data: Partial<TimerState>) => {
      console.log('Timer paused:', data)
      setTimerState((prev) => ({ ...prev, status: 'paused', ...data } as TimerState))
    }

    const handleTimerResumed = (data: Partial<TimerState>) => {
      console.log('Timer resumed:', data)
      setTimerState((prev) => ({ ...prev, status: 'active', ...data } as TimerState))
    }

    const handleTimerLevelChanged = (data: Partial<TimerState> & { toLevel: number }) => {
      console.log('Timer level changed:', data)
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
    }
  }, [socket, gameDateId])

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