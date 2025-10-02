'use client'

import { useAuth } from '@/contexts/AuthContext'
import HomeRankingView from '@/components/tournaments/HomeRankingView'
import { useActiveTournament } from '@/hooks/useActiveTournament'

export default function Home() {
  const { user } = useAuth()
  
  // Use SWR hook for active tournament with PIN authentication
  const { tournament: activeTournament, isLoading, isNotFound } = useActiveTournament({
    refreshInterval: 60000 // 1 minute refresh
  })

  // Loading state
  if (isLoading) {
    return (
      <div>
        <div className="pt-2">
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-white mb-4">Poker de Enfermos</h1>
            <div className="animate-pulse">
              <div className="h-4 bg-white/10 rounded w-48 mx-auto mb-2"></div>
              <div className="h-3 bg-white/5 rounded w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="pt-2">
        {/* Widget de Ranking */}
        {activeTournament ? (
          <HomeRankingView tournamentId={activeTournament.tournament?.id || activeTournament.id} />
        ) : (
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-white mb-4">Poker de Enfermos</h1>
            <p className="text-poker-muted text-lg">
              {isNotFound || !user
                ? 'No hay torneo activo esta noche. Prepara tus fichas para la próxima partida.'
                : 'No pudimos cargar el torneo. Intenta refrescar o vuelve a iniciar sesión.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
