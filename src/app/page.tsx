'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import HomeRankingView from '@/components/tournaments/HomeRankingView'

export default function Home() {
  const { user } = useAuth()
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(null)

  // Obtener torneo activo
  useEffect(() => {
    async function fetchActiveTournament() {
      try {
        const response = await fetch('/api/tournaments/active/public')
        
        if (response.ok) {
          const data = await response.json()
          if (data.tournament) {
            setActiveTournamentId(data.tournament.id)
          }
        }
      } catch (error) {
        console.error('Error fetching active tournament:', error)
      }
    }

    fetchActiveTournament()
  }, [])

  return (
    <div className="min-h-screen bg-poker-dark">
      <div className="pt-2 px-4 pb-8">
        {/* Widget de Ranking */}
        {activeTournamentId ? (
          <HomeRankingView tournamentId={activeTournamentId} />
        ) : (
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-white mb-4">Poker de Enfermos</h1>
            <p className="text-poker-muted text-lg">No hay torneo activo en este momento</p>
          </div>
        )}
      </div>
    </div>
  )
}
