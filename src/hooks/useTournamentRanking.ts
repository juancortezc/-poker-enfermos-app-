import useSWR from 'swr'
import { swrKeys } from '@/lib/swr-config'
import type { TournamentRankingData } from '@/lib/ranking-utils'

interface UseTournamentRankingOptions {
  /** Auto-refresh interval in milliseconds. Default: 30000 (30s) */
  refreshInterval?: number
  /** Enable real-time updates. Default: true */
  revalidateOnFocus?: boolean
  /** Enable background revalidation. Default: true */
  revalidateOnReconnect?: boolean
  /** Fallback data while loading */
  fallbackData?: TournamentRankingData
}

/**
 * Custom hook for tournament ranking data with SWR
 * Provides caching, auto-refresh, and optimistic updates
 * 
 * @param tournamentId - ID of the tournament to fetch ranking for
 * @param options - SWR configuration options
 * @returns SWR response with tournament ranking data
 */
export function useTournamentRanking(
  tournamentId: number | null,
  options: UseTournamentRankingOptions = {}
) {
  const {
    refreshInterval = 30000, // 30 seconds default for ranking data
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    fallbackData
  } = options

  const shouldFetch = tournamentId !== null && tournamentId > 0
  
  const swrResponse = useSWR<TournamentRankingData>(
    shouldFetch ? swrKeys.tournamentRanking(tournamentId) : null,
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      fallbackData,
      
      // Error handling
      shouldRetryOnError: (error) => {
        // Don't retry on 404 (tournament not found)
        if (error?.status === 404) return false
        return true
      },
      
      // Performance optimization
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      
      // Loading timeout
      errorRetryInterval: 5000,
      errorRetryCount: 3
    }
  )

  return {
    ...swrResponse,
    
    // Convenience properties
    ranking: swrResponse.data,
    isLoading: !swrResponse.error && !swrResponse.data,
    isError: !!swrResponse.error,
    isEmpty: swrResponse.data?.rankings?.length === 0,
    
    // Enhanced error information
    errorMessage: swrResponse.error?.message || 'Error loading ranking data',
    isNotFound: swrResponse.error?.status === 404,
    isUnauthorized: swrResponse.error?.status === 401 || swrResponse.error?.status === 403,
    
    // Utility functions
    refresh: () => swrResponse.mutate(),
    
    // Get specific player from ranking
    getPlayer: (playerId: string) => {
      return swrResponse.data?.rankings.find(p => p.playerId === playerId)
    },
    
    // Get top N players
    getTopPlayers: (count: number = 3) => {
      return swrResponse.data?.rankings.slice(0, count) || []
    },
    
    // Tournament info
    tournament: swrResponse.data?.tournament
  }
}

/**
 * Hook for active tournament ranking
 * Automatically fetches ranking for the currently active tournament
 */
export function useActiveTournamentRanking(options: UseTournamentRankingOptions = {}) {
  // First get the active tournament
  const { data: activeTournament } = useSWR(swrKeys.activeTournament(), {
    refreshInterval: 60000, // Check for active tournament every minute
    revalidateOnFocus: true
  })
  
  // Then get its ranking
  return useTournamentRanking(
    activeTournament?.id || null,
    {
      ...options,
      // More frequent updates for active tournament
      refreshInterval: options.refreshInterval || 15000 // 15 seconds
    }
  )
}

/**
 * Hook for multiple tournaments ranking (e.g., for comparison)
 */
export function useMultipleTournamentRankings(
  tournamentIds: number[],
  options: UseTournamentRankingOptions = {}
) {
  // Get rankings for each tournament ID
  const ranking1 = useTournamentRanking(tournamentIds[0] || null, options)
  const ranking2 = useTournamentRanking(tournamentIds[1] || null, options)
  const ranking3 = useTournamentRanking(tournamentIds[2] || null, options)
  
  const rankings = [ranking1, ranking2, ranking3].slice(0, tournamentIds.length)
  
  return {
    rankings,
    isLoading: rankings.some(r => r.isLoading),
    isError: rankings.some(r => r.isError),
    allLoaded: rankings.every(r => r.ranking),
    errors: rankings.filter(r => r.isError).map(r => r.error)
  }
}

// Export types for TypeScript support
export type { UseTournamentRankingOptions, TournamentRankingData }