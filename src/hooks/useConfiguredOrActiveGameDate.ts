import useSWR from 'swr'
import { swrKeys } from '@/lib/swr-config'

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: 'pending' | 'CREATED' | 'in_progress' | 'completed' | 'cancelled'
  playerIds: string[]
  playersCount: number
  tournament: {
    id: number
    name: string
    number: number
  }
  // Indicadores útiles
  isConfigured: boolean  // true si status === 'CREATED'
  isInProgress: boolean  // true si status === 'in_progress'
}

interface UseConfiguredOrActiveGameDateOptions {
  /** Auto-refresh interval in milliseconds. Default: 30000 (30 seconds) */
  refreshInterval?: number
  /** Enable real-time updates. Default: true */
  revalidateOnFocus?: boolean
  /** Enable background revalidation. Default: true */
  revalidateOnReconnect?: boolean
}

/**
 * Custom hook for configured or active game date data
 * Busca fechas en estado CREATED (configuradas) o in_progress (activas)
 * 
 * Útil para:
 * - Dashboard: determinar si deshabilitar botón "FECHA"
 * - Calendar: mostrar fechas configuradas/activas consistentemente
 * - Componentes que necesitan saber si hay fecha "lista" o "corriendo"
 * 
 * @param options - SWR configuration options
 * @returns SWR response with configured or active game date data
 */
export function useConfiguredOrActiveGameDate(options: UseConfiguredOrActiveGameDateOptions = {}) {
  const {
    refreshInterval = 30000, // 30 seconds default
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  const swrResponse = useSWR<GameDate | null>(
    swrKeys.configuredOrActiveGameDate(),
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      
      // Aggressive cache settings to prevent stale data
      revalidateIfStale: true,
      revalidateOnMount: true,
      
      // Error handling
      shouldRetryOnError: (error) => {
        // Don't retry on 404 (no configured/active game date)
        if (error?.status === 404) return false
        return true
      },
      
      // Reduced cache times for more responsive updates
      dedupingInterval: 2000, // Further reduced to 2 seconds
      errorRetryInterval: 5000, // Faster error retry
      errorRetryCount: 3,
      
      // Force validation on window focus
      focusThrottleInterval: 1000,
      
      // Prevent keeping stale data
      keepPreviousData: false
    }
  )

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 useConfiguredOrActiveGameDate:', {
      endpoint: swrKeys.configuredOrActiveGameDate(),
      data: swrResponse.data,
      error: swrResponse.error,
      isLoading: !swrResponse.error && swrResponse.data === undefined,
      hasConfiguredOrActiveDate: !!swrResponse.data,
      status: swrResponse.data?.status
    })
  }

  return {
    ...swrResponse,
    
    // Convenience properties
    gameDate: swrResponse.data || null,
    isLoading: !swrResponse.error && swrResponse.data === undefined,
    isError: !!swrResponse.error,
    
    // Main flags
    hasConfiguredOrActiveDate: !!swrResponse.data,
    hasConfiguredDate: swrResponse.data?.isConfigured || false,
    hasActiveDate: swrResponse.data?.isInProgress || false,
    
    // Enhanced error information
    errorMessage: swrResponse.error?.message || 'Error loading configured/active game date',
    isNotFound: swrResponse.error?.status === 404,
    isUnauthorized: swrResponse.error?.status === 401 || swrResponse.error?.status === 403,
    
    // Utility functions
    refresh: () => swrResponse.mutate(),
    
    // Game date status checks (for backward compatibility)
    isInProgress: swrResponse.data?.status === 'in_progress',
    isCreated: swrResponse.data?.status === 'CREATED',
    
    // Player information
    participantCount: swrResponse.data?.playersCount || 0,
    dateNumber: swrResponse.data?.dateNumber,
    
    // Tournament info
    tournament: swrResponse.data?.tournament || null
  }
}

// Export types
export type { GameDate, UseConfiguredOrActiveGameDateOptions }