import useSWR from 'swr'
import { swrKeys } from '@/lib/swr-config'

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: 'pending' | 'CREATED' | 'in_progress' | 'completed' | 'cancelled'
  playerIds: string[]
  startTime?: string
  endTime?: string
  winnerId?: string
  winnerPoints?: number
  participantCount?: number
}

interface UseGameDatesOptions {
  /** Auto-refresh interval in milliseconds. Default: 30000 (30s) */
  refreshInterval?: number
  /** Enable real-time updates. Default: true */
  revalidateOnFocus?: boolean
  /** Enable background revalidation. Default: true */
  revalidateOnReconnect?: boolean
}

/**
 * Custom hook for tournament game dates
 * 
 * @param tournamentId - ID of the tournament
 * @param options - SWR configuration options
 * @returns SWR response with game dates data
 */
export function useGameDates(
  tournamentId: number | null,
  options: UseGameDatesOptions = {}
) {
  const {
    refreshInterval = 30000, // 30 seconds default
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  const shouldFetch = tournamentId !== null && tournamentId > 0
  
  const swrResponse = useSWR<GameDate[]>(
    shouldFetch ? swrKeys.gameDates(tournamentId) : null,
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      dedupingInterval: 5000,
      errorRetryInterval: 5000,
      errorRetryCount: 3
    }
  )

  const gameDates = swrResponse.data || []

  return {
    ...swrResponse,
    
    // Convenience properties
    gameDates,
    isLoading: !swrResponse.error && !swrResponse.data,
    isError: !!swrResponse.error,
    isEmpty: gameDates.length === 0,
    
    // Enhanced error information
    errorMessage: swrResponse.error?.message || 'Error loading game dates',
    isNotFound: swrResponse.error?.status === 404,
    isUnauthorized: swrResponse.error?.status === 401 || swrResponse.error?.status === 403,
    
    // Utility functions
    refresh: () => swrResponse.mutate(),
    
    // Filter functions
    getCompletedDates: () => gameDates.filter(d => d.status === 'completed'),
    getPendingDates: () => gameDates.filter(d => d.status === 'pending'),
    getActiveDates: () => gameDates.filter(d => d.status === 'in_progress'),
    getCreatedDates: () => gameDates.filter(d => d.status === 'CREATED'),
    
    // Get specific date
    getDateByNumber: (dateNumber: number) => gameDates.find(d => d.dateNumber === dateNumber),
    getDateById: (id: number) => gameDates.find(d => d.id === id),
    
    // Statistics
    stats: {
      total: gameDates.length,
      completed: gameDates.filter(d => d.status === 'completed').length,
      pending: gameDates.filter(d => d.status === 'pending').length,
      active: gameDates.filter(d => d.status === 'in_progress').length,
      created: gameDates.filter(d => d.status === 'CREATED').length,
      progress: gameDates.length > 0 ? 
        Math.round((gameDates.filter(d => d.status === 'completed').length / gameDates.length) * 100) : 0
    },
    
    // Next available date info
    nextDate: gameDates
      .filter(d => d.status === 'pending' || d.status === 'CREATED')
      .sort((a, b) => a.dateNumber - b.dateNumber)[0] || null
  }
}

/**
 * Hook for active game date (currently in progress)
 */
export function useActiveGameDate(options: UseGameDatesOptions = {}) {
  const {
    refreshInterval = 5000, // 5 seconds for active game date
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  const swrResponse = useSWR<GameDate>(
    swrKeys.activeGameDate(),
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      dedupingInterval: 2000, // Faster deduping for active data
      errorRetryInterval: 3000,
      errorRetryCount: 5
    }
  )

  return {
    ...swrResponse,
    
    // Convenience properties
    activeGameDate: swrResponse.data,
    isLoading: !swrResponse.error && !swrResponse.data,
    isError: !!swrResponse.error,
    hasActiveDate: !!swrResponse.data,
    
    // Enhanced error information
    errorMessage: swrResponse.error?.message || 'Error loading active game date',
    isNotFound: swrResponse.error?.status === 404,
    
    // Utility functions
    refresh: () => swrResponse.mutate(),
    
    // Active date info
    isInProgress: swrResponse.data?.status === 'in_progress',
    participantCount: swrResponse.data?.participantCount || swrResponse.data?.playerIds?.length || 0,
    dateNumber: swrResponse.data?.dateNumber,
    
    // Time information
    duration: swrResponse.data?.startTime && swrResponse.data?.endTime ? 
      new Date(swrResponse.data.endTime).getTime() - new Date(swrResponse.data.startTime).getTime() : null,
    
    startedAt: swrResponse.data?.startTime ? new Date(swrResponse.data.startTime) : null
  }
}

/**
 * Hook for specific game date details
 */
export function useGameDate(
  gameDateId: number | null,
  options: UseGameDatesOptions = {}
) {
  const shouldFetch = gameDateId !== null && gameDateId > 0
  
  const swrResponse = useSWR<GameDate>(
    shouldFetch ? swrKeys.gameDate(gameDateId) : null,
    {
      refreshInterval: options.refreshInterval || 10000, // 10 seconds
      revalidateOnFocus: options.revalidateOnFocus ?? true,
      revalidateOnReconnect: options.revalidateOnReconnect ?? true,
      dedupingInterval: 3000,
      errorRetryInterval: 5000,
      errorRetryCount: 3
    }
  )

  return {
    ...swrResponse,
    gameDate: swrResponse.data,
    isLoading: !swrResponse.error && !swrResponse.data,
    isError: !!swrResponse.error,
    refresh: () => swrResponse.mutate()
  }
}

// Export types
export type { GameDate, UseGameDatesOptions }