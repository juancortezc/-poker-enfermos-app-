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

  const getPlayerAlias = (player?: Player) => {
    if (!player) return ''
    return player.aliases && player.aliases.length > 0 ? player.aliases[0] : ''
  }

  const renderPositionRow = (
    label: string,
    badge: string,
    badgeClass: string,
    labelClass: string,
    player?: Player
  ) => {
    if (!player) return null

    return (
      <div className="flex items-center gap-3 bg-black/25 border border-white/10 rounded-xl px-4 py-3">
        <div className={`w-10 h-10 text-sm font-bold rounded-full flex items-center justify-center ${badgeClass}`}>
          {badge}
        </div>
        <div className="flex-1 text-left">
          <p className={`text-xs uppercase tracking-wide font-semibold ${labelClass}`}>{label}</p>
          <p className="text-white font-semibold leading-tight">{formatPlayerName(player)}</p>
          {getPlayerAlias(player) && (
            <p className="text-xs text-white/60">({getPlayerAlias(player)})</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6">
      <div className="grid gap-6">
        {tournaments.map((tournament) => {
          const isHistorical = !tournament.champion.isActive

          return (
            <div key={tournament.tournamentNumber} className="relative pt-16">
              {/* Tournament badge */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-red-600/80 bg-black flex flex-col items-center justify-center shadow-[0_0_35px_rgba(229,9,20,0.45)]">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">Torneo</span>
                  <span className="text-3xl sm:text-4xl font-black text-white leading-none mt-1">
                    {tournament.tournamentNumber}
                  </span>
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wide">
                  1º Campeón
                </div>
              </div>

              <div
                className={`relative bg-gradient-to-b from-white/5 via-black/40 to-black/70 border border-white/10 rounded-3xl px-6 pt-20 pb-6 flex flex-col items-center text-center h-full overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:border-white/25 ${
                  isHistorical ? 'opacity-90 border-gray-500/60' : ''
                }`}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6 w-full">
                  {/* Champion photo */}
                  <div className="w-full max-w-[220px]">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden ring-4 ring-white/10 shadow-2xl">
                      {tournament.champion.photoUrl ? (
                        <img
                          src={tournament.champion.photoUrl}
                          alt={formatPlayerName(tournament.champion)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-900/40 via-yellow-700/30 to-yellow-500/20 flex items-center justify-center text-5xl text-white/50">
                          🏆
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                    </div>
                  </div>

                  {/* Champion info */}
                  <div className="flex flex-col items-center gap-1">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                      {formatPlayerName(tournament.champion)}
                    </h2>
                    {getPlayerAlias(tournament.champion) && (
                      <p className="text-orange-400 text-sm font-semibold">
                        ({getPlayerAlias(tournament.champion)})
                      </p>
                    )}
                    {isHistorical && (
                      <span className="mt-1 inline-flex items-center gap-2 bg-gray-700/70 text-white text-xs font-medium px-3 py-1 rounded-full uppercase tracking-wide">
                        Histórico
                      </span>
                    )}
                  </div>

                  {/* Positions */}
                  <div className="w-full space-y-3 text-sm">
                    {renderPositionRow('Subcampeón', '2º', 'bg-gray-500 text-white', 'text-gray-300', tournament.runnerUp)}
                    {renderPositionRow('Tercero', '3º', 'bg-orange-500 text-white', 'text-orange-300', tournament.thirdPlace)}
                    {renderPositionRow('7', '7º', 'bg-red-500 text-white', 'text-red-300', tournament.siete)}
                    {renderPositionRow('2', '2º', 'bg-purple-500 text-white', 'text-purple-300', tournament.dos)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
