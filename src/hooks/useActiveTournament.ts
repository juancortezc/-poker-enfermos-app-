import useSWR from 'swr'
import { swrKeys } from '@/lib/swr-config'

interface Tournament {
  id: number
  name: string
  number: number
  status: 'PROXIMO' | 'ACTIVO' | 'FINALIZADO'
  startDate?: string
  endDate?: string
  participantCount?: number
  completedDates?: number
  totalDates?: number
}

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string | null
  status: string
}

interface ActiveTournamentResponse {
  tournament: Tournament
  stats: {
    completedDates: number
    totalDates: number
    nextDate?: GameDate
    startDate?: string
    endDate?: string
    isCompleted: boolean
  }
}

interface UseActiveTournamentOptions {
  /** Auto-refresh interval in milliseconds. Default: 60000 (1 min) */
  refreshInterval?: number
  /** Enable real-time updates. Default: true */
  revalidateOnFocus?: boolean
  /** Enable background revalidation. Default: true */
  revalidateOnReconnect?: boolean
}

/**
 * Custom hook for active tournament data
 * Provides caching and auto-refresh for the currently active tournament
 *
 * @param options - SWR configuration options
 * @returns SWR response with active tournament data
 */
export function useActiveTournament(options: UseActiveTournamentOptions = {}) {
  const {
    refreshInterval = 60000, // 1 minute default for tournament status
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  const swrResponse = useSWR<ActiveTournamentResponse>(
    swrKeys.activeTournament(),
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,

      // Error handling
      shouldRetryOnError: (error) => {
        // Don't retry on 404 (no active tournament)
        if (error?.status === 404) return false
        return true
      },

      // Performance
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
      errorRetryInterval: 10000,
      errorRetryCount: 2,

      // Debug logging
      onSuccess: (data) => {
        console.log('✅ useActiveTournament success:', {
          tournament: data?.tournament?.name,
          completedDates: data?.stats?.completedDates
        })
      },
      onError: (error) => {
        console.error('❌ useActiveTournament error:', error)
      }
    }
  )

  const tournamentData = swrResponse.data?.tournament

  console.log('🎯 useActiveTournament state:', {
    hasData: !!swrResponse.data,
    hasError: !!swrResponse.error,
    isLoading: !swrResponse.error && !swrResponse.data,
    tournament: tournamentData?.name
  })

  return {
    ...swrResponse,

    // Convenience properties
    tournament: tournamentData,
    isLoading: !swrResponse.error && !swrResponse.data,
    isError: !!swrResponse.error,
    hasActiveTournament: !!tournamentData,

    // Enhanced error information
    errorMessage: swrResponse.error?.message || 'Error loading active tournament',
    isNotFound: swrResponse.error?.status === 404,
    isUnauthorized: swrResponse.error?.status === 401 || swrResponse.error?.status === 403,

    // Utility functions
    refresh: () => swrResponse.mutate(),

    // Tournament status checks
    isActive: tournamentData?.status === 'ACTIVO',
    isUpcoming: tournamentData?.status === 'PROXIMO',
    isFinished: tournamentData?.status === 'FINALIZADO',

    // Progress information
    progress: tournamentData ? {
      completed: swrResponse.data?.stats.completedDates || 0,
      total: swrResponse.data?.stats.totalDates || 12,
      percentage: Math.round(((swrResponse.data?.stats.completedDates || 0) / (swrResponse.data?.stats.totalDates || 12)) * 100)
    } : null,

    // Next scheduled date
    nextDate: swrResponse.data?.stats.nextDate || null
  }
}

/**
 * Hook for specific tournament data
 */
export function useTournament(tournamentId: number | null, options: UseActiveTournamentOptions = {}) {
  const shouldFetch = tournamentId !== null && tournamentId > 0
  
  const swrResponse = useSWR<Tournament>(
    shouldFetch ? swrKeys.tournament(tournamentId) : null,
    {
      refreshInterval: options.refreshInterval || 120000, // 2 minutes for specific tournament
      revalidateOnFocus: options.revalidateOnFocus ?? true,
      revalidateOnReconnect: options.revalidateOnReconnect ?? true,
      dedupingInterval: 15000,
      errorRetryInterval: 10000,
      errorRetryCount: 2
    }
  )

  return {
    ...swrResponse,
    tournament: swrResponse.data,
    isLoading: !swrResponse.error && !swrResponse.data,
    isError: !!swrResponse.error,
    refresh: () => swrResponse.mutate()
  }
}

// Export types
export type { Tournament, UseActiveTournamentOptions }