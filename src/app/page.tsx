'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import TournamentRankingTable from '@/components/tournaments/TournamentRankingTable'

export default function Home() {
  const { user } = useAuth()
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(null)

  // Obtener torneo activo
  useEffect(() => {
    async function fetchActiveTournament() {
      try {
        if (!user?.adminKey) {
          // If user doesn't have admin key, skip tournament fetch
          return
        }

        const response = await fetch('/api/tournaments/active', {
          headers: {
            'Authorization': `Bearer ${user.adminKey}`,
            'Content-Type': 'application/json'
          }
        })
        
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

    if (user) {
      fetchActiveTournament()
    }
  }, [user])

  return (
    <div className="min-h-screen bg-poker-dark">
      <div className="pt-16 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Poker de Enfermos</h1>
          <p className="text-poker-muted">Bienvenido al sistema del grupo</p>
        </div>

        {/* Widget de Ranking */}
        {activeTournamentId && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Ranking del Torneo</h2>
              <Link 
                href="/ranking"
                className="text-poker-accent hover:text-poker-accent-hover text-sm font-medium transition-colors"
              >
                Ver completo →
              </Link>
            </div>
            <TournamentRankingTable tournamentId={activeTournamentId} compact />
          </div>
        )}
      </div>
    </div>
  )
}
