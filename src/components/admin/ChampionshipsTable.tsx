'use client'

import { useState, useEffect } from 'react'
import LoadingState from '@/components/ui/LoadingState'

interface Player {
  firstName: string
  lastName: string
  isActive: boolean
  photoUrl?: string
  aliases: string[]
}

interface TournamentWinner {
  tournamentNumber: number
  champion: Player
  runnerUp: Player
  thirdPlace: Player
  siete: Player
  dos: Player
}

export default function ChampionshipsTable() {
  const [tournaments, setTournaments] = useState<TournamentWinner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/winners')
      
      if (!response.ok) {
        throw new Error('Error al cargar torneos')
      }

      const result = await response.json()
      
      if (result.success) {
        // Reverse order - most recent tournaments first
        const sortedTournaments = result.data.sort((a: TournamentWinner, b: TournamentWinner) => 
          b.tournamentNumber - a.tournamentNumber
        )
        setTournaments(sortedTournaments)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatPlayerName = (player: Player, isMobile = false) => {
    const fullName = `${player.firstName} ${player.lastName}`
    // En móvil, usar solo nombres o iniciales más apellido
    if (isMobile && fullName.length > 12) {
      const parts = fullName.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}. ${parts[parts.length - 1]}`
      }
    }
    // En desktop, acortar si es muy largo
    if (!isMobile && fullName.length > 15) {
      const parts = fullName.split(' ')
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[parts.length - 1]}`
      }
    }
    return fullName
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Cargando torneos históricos..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={fetchTournaments}
            className="px-4 py-2 bg-poker-red text-white rounded hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!tournaments.length) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-poker-muted">No hay datos de torneos históricos</p>
        </div>
      </div>
    )
  }

  const getPlayerAlias = (player: Player) => {
    return player.aliases && player.aliases.length > 0 ? player.aliases[0] : ''
  }

  return (
    <div className="w-full p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments.map((tournament) => (
          <div
            key={tournament.tournamentNumber}
            className={`relative dashboard-card rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${
              !tournament.champion.isActive ? 'border-2 border-gray-400' : ''
            }`}
          >
            {/* Tournament Number Badge */}
            <div className="absolute top-4 right-4 z-10">
              <div className="bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                <span className="text-xs font-medium">TORNEO</span>
                <span className="text-2xl font-bold block text-center">{tournament.tournamentNumber}</span>
              </div>
            </div>

            {/* Player Photo Section */}
            <div className="relative h-64 sm:h-72">
              {tournament.champion.photoUrl ? (
                <div className="absolute inset-0">
                  <img
                    src={tournament.champion.photoUrl}
                    alt={formatPlayerName(tournament.champion)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/40 via-yellow-700/30 to-yellow-500/20">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-6xl opacity-30">🏆</div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>
              )}

              {/* Champion Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-black font-bold text-sm">1º</span>
                  </div>
                  <span className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">Campeón</span>
                </div>
                <h2 className="text-white text-2xl sm:text-3xl font-bold mb-1 drop-shadow-lg">
                  {formatPlayerName(tournament.champion)}
                </h2>
                {getPlayerAlias(tournament.champion) && (
                  <p className="text-orange-400 text-lg">
                    ({getPlayerAlias(tournament.champion)})
                  </p>
                )}
                {!tournament.champion.isActive && (
                  <div className="inline-block bg-gray-600/80 text-white text-xs px-2 py-1 rounded mt-2">
                    Histórico
                  </div>
                )}
              </div>
            </div>

            {/* Other Positions */}
            <div className="bg-poker-card/50 p-4 space-y-3">
              {/* Subcampeón */}
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-xs">2º</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Subcampeón</p>
                    <p className="text-white font-semibold">{formatPlayerName(tournament.runnerUp)}</p>
                  </div>
                </div>
              </div>

              {/* Tercero */}
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-xs">3º</span>
                  </div>
                  <div>
                    <p className="text-orange-400 text-xs">Tercero</p>
                    <p className="text-white font-semibold">{formatPlayerName(tournament.thirdPlace)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}