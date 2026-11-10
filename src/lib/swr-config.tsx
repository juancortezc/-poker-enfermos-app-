'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'
import { clearStoredAuthTokens, isAuthenticated } from '@/lib/client-auth'

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
    const error = new Error(`HTTP Error: ${response.status}`) as Error & { status?: number; info?: string }
    error.status = response.status
    error.info = await response.text()
    throw error
  }
  
  return response.json()
}

// SWR configuration optimized for Poker app
const swrConfig = {
  fetcher,
  // Global settings
  revalidateOnFocus: false, // OPTIMIZATION: Disabled globally (enable per-hook for critical data)
  revalidateOnReconnect: true, // Revalidate when internet reconnects
  revalidateOnMount: true, // Always fetch on mount for fresh data
  refreshInterval: 0, // No auto-refresh by default (set per hook)
  dedupingInterval: 30000, // OPTIMIZATION: Dedupe requests within 30 seconds (was 5s)
  errorRetryInterval: 5000, // Retry failed requests every 5 seconds
  errorRetryCount: 3, // Max 3 retries for failed requests
  
  // Cache provider for better performance
  provider: () => new Map(),
  
  // Global error handler
  onError: (error: Error & { status?: number }, key: string) => {
    console.error('SWR Error:', { key, error })
    
    // Don't retry on 404s
    if (error.status === 404) return
    
    // 401 = la clave guardada ya no sirve (401 es credencial rechazada; el rol
    // insuficiente responde 403, asi que un Enfermo que abre una pantalla de
    // Comision NO pasa por aqui).
    //
    // Antes esto solo escribia un aviso en la consola y la pantalla se quedaba
    // cargando para siempre: las pantallas que esperan datos obligatorios nunca
    // los reciben y no tienen forma de enterarse. Asi se veia el "no carga
    // nada" — un esqueleto eterno, sin un solo mensaje. Pasa cada vez que
    // alguien cambia su clave en otro dispositivo, o cuando la Comision se la
    // cambia.
    //
    // Ahora se borra la sesion y se vuelve al login, que es lo unico que puede
    // arreglarlo. El guardia del `tenia` evita un bucle: despues de borrar ya no
    // hay credencial, asi que un segundo 401 no recarga de nuevo.
    if (error.status === 401 && typeof window !== 'undefined' && isAuthenticated()) {
      // El borrado pasa por `client-auth`, que es el unico que conoce los
      // nombres de las claves guardadas. Escribirlos aqui a mano dejaba los
      // literales en tres sitios, y el dia que se renombre uno el cierre de
      // sesion borraria la mitad.
      clearStoredAuthTokens()
      localStorage.removeItem('poker-user')
      sessionStorage.setItem('poker-sesion-caducada', '1')
      window.location.href = '/'
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
  tournamentInsights: (tournamentId: number) => `/api/tournaments/${tournamentId}/insights`,
  activeTournament: () => '/api/tournaments/active',
  previousTournament: () => '/api/tournaments/previous',
  tournament: (tournamentId: number) => `/api/tournaments/${tournamentId}`,
  
  // Player related
  playerDetails: (playerId: string) => `/api/players/${playerId}/public`,
  playerTournamentDetails: (playerId: string, tournamentId: number) => 
    `/api/players/${playerId}/tournament/${tournamentId}`,
  
  // Game dates
  gameDates: (tournamentId: number) => `/api/tournaments/${tournamentId}/dates/public`,
  /**
   * La version con eliminaciones, que consume /fecha. Es una clave distinta de
   * gameDates: invalidar solo la publica dejaba esta servida con datos viejos
   * toda la noche, porque ademas tiene revalidateOnFocus en false.
   */
  gameDatesDetailed: (tournamentId: number) => `/api/tournaments/${tournamentId}/dates`,
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
    mutate(swrKeys.gameDatesDetailed(tournamentId))
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