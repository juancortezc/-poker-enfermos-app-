import useSWR from 'swr'
import { useActiveGameDate } from './useActiveGameDate'

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
 * Hook para obtener el estado del timer en tiempo real
 * Se conecta automáticamente a la fecha activa
 */
export function useTimerState(): UseTimerStateReturn {
  // Primero obtenemos la fecha activa
  const { gameDate: activeGameDate, isInProgress } = useActiveGameDate({
    refreshInterval: 5000 // Refresh cada 5 segundos
  })

  // Luego obtenemos el estado del timer para esa fecha
  const { 
    data: timerState, 
    error, 
    mutate: refresh 
  } = useSWR<TimerState>(
    activeGameDate && isInProgress ? `/api/timer/game-date/${activeGameDate.id}` : null,
    {
      refreshInterval: 1000, // Actualizar cada segundo para el timer
      revalidateOnFocus: true,
      dedupingInterval: 500
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