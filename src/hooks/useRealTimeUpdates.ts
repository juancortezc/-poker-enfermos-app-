import { useEffect } from 'react'
import { mutate } from 'swr'
import { swrKeys, mutateRelated } from '@/lib/swr-config'
import { io, Socket } from 'socket.io-client'

interface RealTimeUpdatesOptions {
  /** Enable real-time updates. Default: true */
  enabled?: boolean
  /** Tournament ID to listen for updates */
  tournamentId?: number
  /** Game date ID to listen for updates */
  gameDateId?: number
}

/**
 * Hook to integrate Socket.io with SWR for real-time updates
 * Automatically revalidates SWR cache when receiving socket events
 * 
 * @param options - Configuration options
 */
export function useRealTimeUpdates(options: RealTimeUpdatesOptions = {}) {
  const { enabled = true, tournamentId, gameDateId } = options

  useEffect(() => {
    if (!enabled) return

    let socket: Socket | null = null

    try {
      // Initialize socket connection
      socket = io({
        path: '/api/socket',
        addTrailingSlash: false,
      })

      // Tournament-related events
      if (tournamentId) {
        socket.on(`tournament:${tournamentId}:updated`, () => {
          console.log('🔄 Tournament updated, revalidating cache...')
          mutateRelated.tournamentRanking(mutate, tournamentId)
        })

        socket.on(`tournament:${tournamentId}:ranking-changed`, () => {
          console.log('🏆 Ranking changed, revalidating cache...')
          mutate(swrKeys.tournamentRanking(tournamentId))
        })
      }

      // Game date related events
      if (gameDateId) {
        socket.on(`gamedate:${gameDateId}:elimination`, () => {
          console.log('💀 New elimination, revalidating cache...')
          if (tournamentId) {
            mutateRelated.elimination(mutate, tournamentId, gameDateId)
          }
        })

        socket.on(`gamedate:${gameDateId}:started`, () => {
          console.log('🎮 Game date started, revalidating cache...')
          mutate(swrKeys.activeGameDate())
          if (tournamentId) {
            mutate(swrKeys.gameDates(tournamentId))
          }
        })

        socket.on(`gamedate:${gameDateId}:completed`, () => {
          console.log('✅ Game date completed, revalidating cache...')
          mutate(swrKeys.activeGameDate())
          if (tournamentId) {
            mutateRelated.gameDate(mutate, tournamentId, gameDateId)
          }
        })
      }

      // Global events
      socket.on('active-tournament-changed', () => {
        console.log('🔄 Active tournament changed, revalidating cache...')
        mutate(swrKeys.activeTournament())
      })

      socket.on('active-gamedate-changed', () => {
        console.log('📅 Active game date changed, revalidating cache...')
        mutate(swrKeys.activeGameDate())
      })

      socket.on('player-updated', (playerId: string) => {
        console.log(`👤 Player ${playerId} updated, revalidating cache...`)
        mutate(swrKeys.playerDetails(playerId))
      })

      // Connection events
      socket.on('connect', () => {
        console.log('🔌 Socket connected')
      })

      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected')
      })

      socket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error)
      })

    } catch (error) {
      console.error('Failed to initialize socket:', error)
    }

    // Cleanup function
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [enabled, tournamentId, gameDateId])

  return {
    // Helper functions to manually trigger cache updates
    revalidateTournament: (id: number) => {
      mutateRelated.tournamentRanking(mutate, id)
    },
    revalidateGameDate: (tournamentId: number, gameDateId?: number) => {
      mutateRelated.gameDate(mutate, tournamentId, gameDateId)
    },
    revalidateElimination: (tournamentId: number, gameDateId: number) => {
      mutateRelated.elimination(mutate, tournamentId, gameDateId)
    }
  }
}

/**
 * Hook specifically for tournament ranking real-time updates
 * Use this in components that display ranking data
 */
export function useTournamentRealTimeUpdates(tournamentId: number | null) {
  return useRealTimeUpdates({
    enabled: tournamentId !== null,
    tournamentId: tournamentId || undefined
  })
}

/**
 * Hook specifically for game date real-time updates
 * Use this in components like registration page
 */
export function useGameDateRealTimeUpdates(
  tournamentId: number | null, 
  gameDateId: number | null
) {
  return useRealTimeUpdates({
    enabled: tournamentId !== null && gameDateId !== null,
    tournamentId: tournamentId || undefined,
    gameDateId: gameDateId || undefined
  })
}

/**
 * Hook for global real-time updates
 * Use this in layout or dashboard components
 */
export function useGlobalRealTimeUpdates() {
  return useRealTimeUpdates({
    enabled: true
  })
}