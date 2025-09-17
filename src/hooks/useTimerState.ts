import useSWR from 'swr'
import { useActiveGameDate } from './useGameDateStatus'
import { adaptiveIntervals } from '@/lib/swr-config'
import { useEffect, useState } from 'react'

// Fetcher con autenticación
const timerFetcher = async (url: string) => {
  // Get auth token from localStorage
  const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('poker-adminkey') : null
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  // Use PIN if available, otherwise fall back to adminKey
  if (pin) {
    headers['Authorization'] = `Bearer PIN:${pin}`
  } else if (adminKey) {
    headers['Authorization'] = `Bearer ADMIN:${adminKey}`
  }

  const response = await fetch(url, { headers })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  
  return response.json()
}

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface TimerState {
  id: number
  gameDateId: number
  status: 'active' | 'paused' | 'stopped'
  currentLevel: number
  timeRemaining: number
  startTime: string
  levelStartTime: string
  blindLevels: BlindLevel[]
  createdAt: string
  updatedAt: string
}

interface UseTimerStateReturn {
  timerState: TimerState | null
  currentBlindLevel: BlindLevel | null
  nextBlindLevel: BlindLevel | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refresh: () => void
  isActive: boolean
  isPaused: boolean
  formattedTimeRemaining: string
}

// Función auxiliar para formatear tiempo
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Hook para obtener el estado del timer con intervalos inteligentes optimizados para móviles
 * Se conecta automáticamente a la fecha activa
 */
export function useTimerState(): UseTimerStateReturn {
  // Track page visibility for smart interval management
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Primero obtenemos la fecha activa con intervalos optimizados
  const { gameDate: activeGameDate, isInProgress } = useActiveGameDate({
    refreshInterval: adaptiveIntervals.liveGame.foreground
  })

  // Determinar el intervalo del timer basado en estado y visibilidad
  const getTimerInterval = () => {
    if (!isVisible) return 0 // Pause when not visible
    if (!activeGameDate || !isInProgress) return adaptiveIntervals.timer.inactive
    return adaptiveIntervals.timer.active
  }

  // Luego obtenemos el estado del timer para esa fecha
  const { 
    data: timerState, 
    error, 
    mutate: refresh 
  } = useSWR<TimerState>(
    activeGameDate && isInProgress ? `/api/timer/game-date/${activeGameDate.id}` : null,
    timerFetcher,
    {
      refreshInterval: getTimerInterval(),
      revalidateOnFocus: true,
      refreshWhenHidden: false, // Don't refresh when hidden
      dedupingInterval: 1000, // Increased for mobile optimization
    }
  )

  // Calcular blind level actual
  const currentBlindLevel = timerState?.blindLevels?.find(
    level => level.level === timerState.currentLevel
  ) || null

  // Calcular próximo blind level
  const nextBlindLevel = timerState?.blindLevels?.find(
    level => level.level === timerState.currentLevel + 1
  ) || null

  // Formatear tiempo restante
  const formattedTimeRemaining = timerState?.timeRemaining 
    ? formatTime(timerState.timeRemaining)
    : '--:--'

  return {
    timerState: timerState || null,
    currentBlindLevel,
    nextBlindLevel,
    isLoading: !error && !timerState && !!activeGameDate,
    isError: !!error,
    error,
    refresh,
    isActive: timerState?.status === 'active',
    isPaused: timerState?.status === 'paused',
    formattedTimeRemaining
  }
}

// Hook alternativo para usar con un gameDateId específico
export function useTimerStateById(gameDateId: number | null): UseTimerStateReturn {
  const { 
    data: timerState, 
    error, 
    mutate: refresh 
  } = useSWR<TimerState>(
    gameDateId ? `/api/timer/game-date/${gameDateId}` : null,
    timerFetcher,
    {
      refreshInterval: 1000,
      revalidateOnFocus: true,
      dedupingInterval: 500
    }
  )

  const currentBlindLevel = timerState?.blindLevels?.find(
    level => level.level === timerState.currentLevel
  ) || null

  const nextBlindLevel = timerState?.blindLevels?.find(
    level => level.level === timerState.currentLevel + 1
  ) || null

  const formattedTimeRemaining = timerState?.timeRemaining 
    ? formatTime(timerState.timeRemaining)
    : '--:--'

  return {
    timerState: timerState || null,
    currentBlindLevel,
    nextBlindLevel,
    isLoading: !error && !timerState && !!gameDateId,
    isError: !!error,
    error,
    refresh,
    isActive: timerState?.status === 'active',
    isPaused: timerState?.status === 'paused',
    formattedTimeRemaining
  }
}