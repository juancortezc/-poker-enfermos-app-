import useSWR from 'swr'

// Types basados en la respuesta de la API /game-dates/[id]/live-status
export interface LiveGameDateStatus {
  gameDate: {
    id: number
    dateNumber: number
    status: string
    totalPlayers: number
    startedAt: string | null
    scheduledDate: string
  }
  tournament: {
    id: number
    number: number
    name: string
  }
  liveStats: {
    playersRemaining: number
    totalPlayers: number
    winnerPoints: number
    nextPosition: number
    eliminationsCount: number
  }
  currentBlind: {
    level: number
    smallBlind: number
    bigBlind: number
    duration: number
    timeRemaining: number
  }
  activePlayers: Array<{
    id: string
    firstName: string
    lastName: string
  }>
  recentEliminations: Array<{
    id: number
    position: number
    eliminatedPlayerId: string
    eliminatorPlayerId: string | null
    gameDateId: number
    points: number
    createdAt: string
    eliminatedPlayer: {
      id: string
      firstName: string
      lastName: string
    }
  }>
}

interface UseGameDateLiveStatusOptions {
  /** Auto-refresh interval in milliseconds. Default: 5000 (5 seconds) */
  refreshInterval?: number
  /** Enable real-time updates. Default: true */
  revalidateOnFocus?: boolean
  /** Enable background revalidation. Default: true */
  revalidateOnReconnect?: boolean
  /** Enable automatic refresh only when page is visible. Default: true */
  revalidateIfStale?: boolean
}

/**
 * Custom hook for live game date status with real-time updates
 * Optimizado para datos en tiempo real con refresh cada 5 segundos
 * 
 * @param gameDateId - ID de la fecha de juego
 * @param options - SWR configuration options
 * @returns SWR response with live game date status
 */
export function useGameDateLiveStatus(
  gameDateId: number | null, 
  options: UseGameDateLiveStatusOptions = {}
) {
  const {
    refreshInterval = 5000, // 5 segundos para datos en tiempo real
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    revalidateIfStale = true
  } = options

  const shouldFetch = gameDateId !== null && gameDateId > 0

  const swrResponse = useSWR<LiveGameDateStatus>(
    shouldFetch ? `/api/game-dates/${gameDateId}/live-status` : null,
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      revalidateIfStale,
      
      // Error handling optimizado para datos en tiempo real
      shouldRetryOnError: (error) => {
        // No retry en 404 (fecha no encontrada)
        if (error?.status === 404) return false
        // No retry en 403 (sin permisos)
        if (error?.status === 403) return false
        return true
      },
      
      // Performance para datos en tiempo real
      dedupingInterval: 2000, // Dedupe requests dentro de 2 segundos
      errorRetryInterval: 5000, // Retry cada 5 segundos en caso de error
      errorRetryCount: 3, // Máximo 3 reintentos
      
      // Refresh en background sin mostrar loading
      revalidateOnMount: true,
      refreshWhenHidden: false, // No refresh cuando la página está oculta
      refreshWhenOffline: false // No refresh sin conexión
    }
  )

  return {
    ...swrResponse,
    
    // Convenience properties
    liveStatus: swrResponse.data,
    isLoading: !swrResponse.error && !swrResponse.data && shouldFetch,
    isError: !!swrResponse.error,
    hasData: !!swrResponse.data,
    
    // Enhanced error information
    errorMessage: swrResponse.error?.message || 'Error loading live status',
    isNotFound: swrResponse.error?.status === 404,
    isForbidden: swrResponse.error?.status === 403,
    isServerError: swrResponse.error?.status >= 500,
    
    // Utility functions
    refresh: () => swrResponse.mutate(),
    
    // Live data checks
    isGameActive: swrResponse.data?.gameDate.status === 'in_progress',
    hasActivePlayers: (swrResponse.data?.liveStats.playersRemaining || 0) > 0,
    isGameFinished: (swrResponse.data?.liveStats.playersRemaining || 0) <= 1,
    
    // Quick access to key data
    playersRemaining: swrResponse.data?.liveStats.playersRemaining || 0,
    totalPlayers: swrResponse.data?.liveStats.totalPlayers || 0,
    eliminationsCount: swrResponse.data?.liveStats.eliminationsCount || 0,
    winnerPoints: swrResponse.data?.liveStats.winnerPoints || 0,
    
    // Timer information
    currentBlind: swrResponse.data?.currentBlind || null,
    timeRemaining: swrResponse.data?.currentBlind.timeRemaining || 0,
    
    // Players data
    activePlayers: swrResponse.data?.activePlayers || [],
    recentEliminations: swrResponse.data?.recentEliminations || [],
    
    // Tournament info
    tournament: swrResponse.data?.tournament || null,
    gameDate: swrResponse.data?.gameDate || null
  }
}

// Export types
export type { UseGameDateLiveStatusOptions }