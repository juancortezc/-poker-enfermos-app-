import useSWR from 'swr'

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: 'pending' | 'CREATED' | 'in_progress' | 'completed' | 'cancelled'
  playerIds: string[]
  startTime: string | null
  playersMin: number
  playersMax: number
  tournamentId: number
}

interface UseActiveGameDateOptions {
  /** Auto-refresh interval in milliseconds. Default: 30000 (30 seconds) */
  refreshInterval?: number
  /** Enable real-time updates. Default: true */
  revalidateOnFocus?: boolean
  /** Enable background revalidation. Default: true */
  revalidateOnReconnect?: boolean
}

/**
 * Custom hook for active game date data
 * Provides caching and auto-refresh for the currently active game date
 * 
 * @param options - SWR configuration options
 * @returns SWR response with active game date data
 */
export function useActiveGameDate(options: UseActiveGameDateOptions = {}) {
  const {
    refreshInterval = 30000, // 30 seconds default
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  const swrResponse = useSWR<GameDate | null>(
    '/api/game-dates/active',
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      
      // Error handling
      shouldRetryOnError: (error) => {
        // Don't retry on 404 (no active game date)
        if (error?.status === 404) return false
        return true
      },
      
      // Performance
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
      errorRetryInterval: 10000,
      errorRetryCount: 2
    }
  )

  return {
    ...swrResponse,
    
    // Convenience properties
    gameDate: swrResponse.data || null,
    isLoading: !swrResponse.error && !swrResponse.data === undefined,
    isError: !!swrResponse.error,
    hasActiveGameDate: !!swrResponse.data,
    
    // Enhanced error information
    errorMessage: swrResponse.error?.message || 'Error loading active game date',
    isNotFound: swrResponse.error?.status === 404,
    isUnauthorized: swrResponse.error?.status === 401 || swrResponse.error?.status === 403,
    
    // Utility functions
    refresh: () => swrResponse.mutate(),
    
    // Game date status checks
    isInProgress: swrResponse.data?.status === 'in_progress',
    isCreated: swrResponse.data?.status === 'CREATED',
    isPending: swrResponse.data?.status === 'pending',
    isCompleted: swrResponse.data?.status === 'completed',
    isCancelled: swrResponse.data?.status === 'cancelled'
  }
}

// Export types
export type { GameDate, UseActiveGameDateOptions }