import useSWR from 'swr'
import { swrKeys } from '@/lib/swr-config'
import type { TournamentInsightsData } from '@/lib/ranking-utils'

interface UseTournamentInsightsOptions {
  refreshInterval?: number
  revalidateOnFocus?: boolean
}

/**
 * Rachas de posición (últimas fechas) y récords de temporada, usados en la
 * home nueva ("Los que vienen calientes" / "Los Malazos 7/2" / "La temporada
 * en números").
 */
export function useTournamentInsights(
  tournamentId: number | null,
  options: UseTournamentInsightsOptions = {}
) {
  const { refreshInterval = 60000, revalidateOnFocus = true } = options

  const shouldFetch = tournamentId !== null && tournamentId > 0

  const swrResponse = useSWR<TournamentInsightsData>(
    shouldFetch ? swrKeys.tournamentInsights(tournamentId) : null,
    {
      refreshInterval,
      revalidateOnFocus,
      dedupingInterval: 5000
    }
  )

  return {
    ...swrResponse,
    insights: swrResponse.data,
    isLoading: !swrResponse.error && !swrResponse.data,
    isError: !!swrResponse.error,
    refresh: () => swrResponse.mutate()
  }
}

export type { UseTournamentInsightsOptions, TournamentInsightsData }
