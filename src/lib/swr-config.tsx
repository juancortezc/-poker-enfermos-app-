'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

// Detect mobile devices for optimized configurations
const isMobile = typeof window !== 'undefined' ? 
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) : false

// Detect iOS specifically for special handling
const isIOS = typeof window !== 'undefined' ? 
  /iPad|iPhone|iPod/.test(navigator.userAgent) : false

// Check if app is running in standalone mode (PWA)
const isStandalone = typeof window !== 'undefined' ? 
  window.matchMedia('(display-mode: standalone)').matches || 
  (window.navigator as any).standalone === true : false

// Hybrid storage helper for mobile reliability
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key)
  } catch (error) {
    try {
      return sessionStorage.getItem(key)
    } catch (sessionError) {
      return null
    }
  }
}

// Custom fetcher que incluye autenticación con PIN
const fetcher = async (url: string) => {
  // Get auth token from hybrid storage (PIN system)
  const pin = getStorageItem('poker-pin')
  // Legacy support for adminKey during transition
  const adminKey = getStorageItem('poker-adminkey')
  
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
    const error = new Error(`HTTP Error: ${response.status}`) as Error & { status?: number; info?: string }
    error.status = response.status
    error.info = await response.text()
    throw error
  }
  
  return response.json()
}

// Mobile-optimized SWR configuration
const swrConfig = {
  fetcher,
  
  // Global settings optimized for mobile devices
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshWhenHidden: false, // Don't refresh when app is in background
  refreshWhenOffline: false, // Don't try to refresh when offline
  refreshInterval: 0, // No auto-refresh by default (set per hook)
  
  // Mobile-optimized intervals
  dedupingInterval: isMobile ? 10000 : 5000, // Longer deduping on mobile
  errorRetryInterval: isMobile ? 8000 : 5000, // Less aggressive retry on mobile
  errorRetryCount: isMobile ? 2 : 3, // Fewer retries on mobile
  
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

// Export fetcher and device detection for direct use
export { fetcher, isMobile, isIOS, isStandalone }

// Adaptive intervals based on device and context
export const adaptiveIntervals = {
  // Timer intervals (critical for real-time)
  timer: {
    active: 1000,        // 1s when timer is actively running
    inactive: isMobile ? 30000 : 15000,  // 30s mobile, 15s desktop when no active timer
  },
  
  // Live game data (important for ongoing games)
  liveGame: {
    foreground: isMobile ? 3000 : 2000,  // 3s mobile, 2s desktop
    background: 0,       // Pause when in background
  },
  
  // Tournament/ranking data (normal priority)
  tournament: {
    foreground: isMobile ? 90000 : 60000, // 1.5min mobile, 1min desktop
    background: isMobile ? 180000 : 120000, // 3min mobile, 2min desktop
  },
  
  // Admin/stats data (low priority)
  admin: {
    foreground: 120000,  // 2min
    background: 300000,  // 5min
  }
}

// Get appropriate interval based on data type and visibility
export function getInterval(type: keyof typeof adaptiveIntervals, isVisible = true): number {
  const intervals = adaptiveIntervals[type]
  
  if (typeof intervals === 'object') {
    return isVisible ? intervals.foreground : intervals.background
  }
  
  return intervals
}

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