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
      <section className="space-y-6">
        <header className="text-center space-y-2 py-12">
          <h1 className="font-heading text-3xl uppercase tracking-[0.24em] text-[#f3e6c5]">
            Poker de Enfermos
          </h1>
          <p className="text-sm text-[#d7c59a]/70">
            Preparando el Noir Jazz Lounge...
          </p>
          <div className="mx-auto mt-6 h-16 w-16 animate-spin rounded-full border-4 border-[#e0b66c] border-t-transparent" />
        </header>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      {activeTournament ? (
        <HomeRankingView tournamentId={activeTournament.tournament?.id || activeTournament.id} />
      ) : (
        <div className="paper px-6 py-10 text-center">
          <h2 className="font-heading text-2xl uppercase tracking-[0.22em] text-[#f3e6c5]">
            Poker de Enfermos
          </h2>
          <p className="mt-4 text-[#d7c59a]">
            {isNotFound || !user
              ? 'No hay torneo activo esta noche. La mesa abrirá pronto; mantén listo tu mejor juego.'
              : 'No pudimos cargar el torneo. Refresca la página o inicia sesión nuevamente para continuar.'}
          </p>
        </div>
      )}
    </section>
  )
}
