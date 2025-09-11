'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

// Custom fetcher que incluye autenticación con PIN
const fetcher = async (url: string) => {
  // Get auth token from localStorage (PIN system)
  const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
  // Legacy support for adminKey during transition
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
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  })
  
  if (!response.ok) {
    // Create error object with status for better error handling
    const error = new Error(`HTTP Error: ${response.status}`)
    ;(error as any).status = response.status
    ;(error as any).info = await response.text()
    throw error
  }
  
  return response.json()
}

// SWR configuration optimized for Poker app
const swrConfig = {
  fetcher,
  // Global settings
  revalidateOnFocus: true, // Revalidate when user returns to tab
  revalidateOnReconnect: true, // Revalidate when internet reconnects
  refreshInterval: 0, // No auto-refresh by default (set per hook)
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryInterval: 5000, // Retry failed requests every 5 seconds
  errorRetryCount: 3, // Max 3 retries for failed requests
  
  // Cache provider for better performance
  provider: () => new Map(),
  
  // Global error handler
  onError: (error: Error & { status?: number }, key: string) => {
    console.error('SWR Error:', { key, error })
    
    // Don't retry on 404s
    if (error.status === 404) return
    
    // Handle auth errors
    if (error.status === 401 || error.status === 403) {
      console.warn('Authentication error, consider refreshing auth token')
    }
  },
  
  // Loading timeout
  loadingTimeout: 10000, // 10 seconds
  
  // Success handler
  onSuccess: (data: unknown, key: string) => {
    // Optional: Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('SWR Success:', { key, dataLength: Array.isArray(data) ? data.length : 'object' })
    }
  }
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}

// Export fetcher for direct use if needed
export { fetcher }

// SWR key generators for consistency
export const swrKeys = {
  // Tournament related
  tournamentRanking: (tournamentId: number) => `/api/tournaments/${tournamentId}/ranking`,
  activeTournament: () => '/api/tournaments/active',
  tournament: (tournamentId: number) => `/api/tournaments/${tournamentId}`,
  
  // Player related
  playerDetails: (playerId: string) => `/api/players/${playerId}/public`,
  playerTournamentDetails: (playerId: string, tournamentId: number) => 
    `/api/players/${playerId}/tournament/${tournamentId}`,
  
  // Game dates
  gameDates: (tournamentId: number) => `/api/tournaments/${tournamentId}/dates/public`,
  activeGameDate: () => '/api/game-dates/active',
  gameDate: (gameDateId: number) => `/api/game-dates/${gameDateId}`,
  
  // Eliminations
  gameDateEliminations: (gameDateId: number) => `/api/eliminations/game-date/${gameDateId}`,
  
  // Other
  availablePlayers: () => '/api/players?role=Enfermo,Comision&active=true',
  availableGuests: () => '/api/players/available-guests'
} as const

// Helper function to mutate related keys
export const mutateRelated = {
  // When tournament ranking changes, update related keys
  tournamentRanking: (mutate: (key: string) => void, tournamentId: number) => {
    mutate(swrKeys.tournamentRanking(tournamentId))
    mutate(swrKeys.activeTournament())
  },
  
  // When game date changes, update related tournament data
  gameDate: (mutate: (key: string) => void, tournamentId: number, gameDateId?: number) => {
    mutate(swrKeys.gameDates(tournamentId))
    mutate(swrKeys.tournamentRanking(tournamentId))
    mutate(swrKeys.activeGameDate())
    if (gameDateId) {
      mutate(swrKeys.gameDate(gameDateId))
      mutate(swrKeys.gameDateEliminations(gameDateId))
    }
  },
  
  // When elimination happens, update all related data
  elimination: (mutate: (key: string) => void, tournamentId: number, gameDateId: number) => {
    mutate(swrKeys.gameDateEliminations(gameDateId))
    mutate(swrKeys.gameDate(gameDateId))
    mutate(swrKeys.tournamentRanking(tournamentId))
    mutate(swrKeys.gameDates(tournamentId))
  }
}