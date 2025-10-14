import useSWR from 'swr'
import { useMemo, useEffect } from 'react'
import { useActiveGameDate } from './useActiveGameDate'
import { useSocket } from './useSocket'

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface TimerStatePayload {
  success: boolean
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
  const { data, error, mutate } = useSWR<TimerStatePayload>(key, {
    refreshInterval: 1000, // Poll cada 1 segundo para actualización en tiempo real
    revalidateOnFocus: true,
    dedupingInterval: 400
  })

  const { socket } = useSocket()

  useEffect(() => {
    if (!socket || !key) return
    const match = key.match(/game-date\/(\d+)/)
    if (!match) return
    const id = Number(match[1])
    if (!Number.isFinite(id)) return

    const handleTimerState = () => {
      mutate()
    }

    socket.emit('join-timer', id)
    socket.on('timer-state', handleTimerState)

    return () => {
      socket.emit('leave-timer', id)
      socket.off('timer-state', handleTimerState)
    }
  }, [socket, key, mutate])

  const timerState = data?.timerState ?? null
  const currentBlind = data?.currentBlind ?? null
  const nextBlind = data?.nextBlind ?? null

  const formattedTime = useMemo(() => {
    if (!timerState) return '--:--'
    return formatTime(timerState.timeRemaining)
  }, [timerState])

  return {
    response: data ?? null,
    timerState,
    currentBlindLevel: currentBlind,
    nextBlindLevel: nextBlind,
    formattedTimeRemaining: formattedTime,
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
