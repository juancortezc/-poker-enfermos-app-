'use client'

import useSWR from 'swr'
import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { useActiveGameDate } from './useActiveGameDate'
import { useSocketContext } from '@/contexts/SocketContext'

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface TimerStatePayload {
  success: boolean
  serverTime: number // Timestamp del servidor para sincronización
  timerState: {
    id: number
    gameDateId: number
    status: 'active' | 'paused' | 'stopped'
    currentLevel: number
    timeRemaining: number
    totalElapsed: number
    startTime: string | null
    levelStartTime: string | null
  }
  currentBlind: BlindLevel | null
  nextBlind: BlindLevel | null
  tournament: {
    id: number
    name: string
  }
  gameDate: {
    id: number
    dateNumber: number
    status: string
  }
  isActive: boolean
  canControl: boolean
}

interface UseTimerStateReturn {
  response: TimerStatePayload | null
  timerState: TimerStatePayload['timerState'] | null
  currentBlindLevel: BlindLevel | null
  nextBlindLevel: BlindLevel | null
  formattedTimeRemaining: string
  displayTimeRemaining: number // Tiempo calculado client-side
  isLoading: boolean
  isError: boolean
  error: Error | null
  refresh: () => void
  isActive: boolean
  isPaused: boolean
}

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function useTimerStateInternal(key: string | null): UseTimerStateReturn {
  // Reducir polling a 5 segundos como fallback (antes era 1s)
  const { data, error, mutate } = useSWR<TimerStatePayload>(key, {
    refreshInterval: 5000, // Polling cada 5 segundos como fallback
    revalidateOnFocus: true,
    dedupingInterval: 1000
  })

  const { socket, joinTimerRoom, leaveTimerRoom, serverTimeOffset } = useSocketContext()

  // Estado local para countdown client-side
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState<number>(0)
  const lastSyncRef = useRef<{
    timeRemaining: number
    levelStartTime: string | null
    status: string
    syncedAt: number
  } | null>(null)

  // Sincronizar con datos del servidor
  useEffect(() => {
    if (!data?.timerState) return

    const { timeRemaining, levelStartTime, status } = data.timerState
    const serverTime = data.serverTime || Date.now()

    // Calcular offset ajustado
    const adjustedNow = Date.now() + serverTimeOffset

    if (status === 'active' && levelStartTime) {
      // Calcular tiempo restante basado en levelStartTime del servidor
      const levelStart = new Date(levelStartTime).getTime()
      const elapsedSinceLevelStart = Math.floor((adjustedNow - levelStart) / 1000)
      const calculatedRemaining = Math.max(0, timeRemaining - elapsedSinceLevelStart)
      setDisplayTimeRemaining(calculatedRemaining)
    } else {
      // Si está pausado, usar el timeRemaining directo
      setDisplayTimeRemaining(timeRemaining)
    }

    lastSyncRef.current = {
      timeRemaining,
      levelStartTime,
      status,
      syncedAt: Date.now()
    }
  }, [data, serverTimeOffset])

  // Countdown local cada segundo cuando está activo
  useEffect(() => {
    if (!data?.timerState || data.timerState.status !== 'active') return

    const interval = setInterval(() => {
      setDisplayTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [data?.timerState?.status])

  // Escuchar eventos de Socket.IO
  useEffect(() => {
    if (!socket || !key) return
    const match = key.match(/game-date\/(\d+)/)
    if (!match) return
    const id = Number(match[1])
    if (!Number.isFinite(id)) return

    const handleTimerState = () => {
      mutate()
    }

    joinTimerRoom(id)
    socket.on('timer-state', handleTimerState)
    socket.on('timer-paused', handleTimerState)
    socket.on('timer-resumed', handleTimerState)
    socket.on('timer-level-changed', handleTimerState)
    socket.on('timer-started', handleTimerState)

    return () => {
      socket.off('timer-state', handleTimerState)
      socket.off('timer-paused', handleTimerState)
      socket.off('timer-resumed', handleTimerState)
      socket.off('timer-level-changed', handleTimerState)
      socket.off('timer-started', handleTimerState)
      leaveTimerRoom(id)
    }
  }, [socket, key, mutate, joinTimerRoom, leaveTimerRoom])

  // Re-sync cuando la página vuelve a ser visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        mutate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [mutate])

  const timerState = data?.timerState ?? null
  const currentBlind = data?.currentBlind ?? null
  const nextBlind = data?.nextBlind ?? null

  const formattedTime = useMemo(() => {
    return formatTime(displayTimeRemaining)
  }, [displayTimeRemaining])

  return {
    response: data ?? null,
    timerState,
    currentBlindLevel: currentBlind,
    nextBlindLevel: nextBlind,
    formattedTimeRemaining: formattedTime,
    displayTimeRemaining,
    isLoading: !error && !data && !!key,
    isError: !!error,
    error,
    refresh: () => mutate(),
    isActive: timerState?.status === 'active',
    isPaused: timerState?.status === 'paused'
  }
}

export function useTimerState(): UseTimerStateReturn {
  const { gameDate: activeGameDate, isInProgress } = useActiveGameDate({
    refreshInterval: 5000
  })

  const key = activeGameDate && isInProgress
    ? `/api/timer/game-date/${activeGameDate.id}`
    : null

  return useTimerStateInternal(key)
}

export function useTimerStateById(gameDateId: number | null): UseTimerStateReturn {
  const key = gameDateId ? `/api/timer/game-date/${gameDateId}` : null
  return useTimerStateInternal(key)
}
