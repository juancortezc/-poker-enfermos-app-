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
        <div className="rounded-2xl border border-[#e0b66c]/20 bg-[#24160f]/40 p-8 text-center text-[#d7c59a]">
          <LoadingState message="Cargando torneos históricos..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/20 via-[#24160f] to-[#1a1208] p-8 text-center text-rose-100">
          <p className="mb-4 text-sm">Error: {error}</p>
          <button
            onClick={fetchTournaments}
            className="rounded-full border border-[#e0b66c]/30 bg-[#24160f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#d7c59a] transition-all hover:border-[#e0b66c]/50 hover:text-[#f3e6c5]"
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
        <div className="rounded-2xl border border-[#e0b66c]/20 bg-[#24160f]/40 p-8 text-center text-[#d7c59a]">
          <p>No hay datos de torneos históricos</p>
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
      <div className="flex items-center gap-3 rounded-2xl border border-[#e0b66c]/20 bg-[#24160f]/40 px-4 py-3 backdrop-blur-sm">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${badgeClass}`}>
          {badge}
        </div>
        <div className="flex-1 text-left">
          <p className={`text-[11px] uppercase tracking-[0.2em] font-semibold ${labelClass}`}>{label}</p>
          <p className="text-sm font-semibold text-[#f3e6c5] leading-tight">{formatPlayerName(player)}</p>
          {getPlayerAlias(player) && (
            <p className="text-xs text-[#d7c59a]">({getPlayerAlias(player)})</p>
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
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#a9441c]/80 bg-[#1a1208] flex flex-col items-center justify-center shadow-[0_0_35px_rgba(224,182,108,0.35)]">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[#d7c59a]">Torneo</span>
                  <span className="text-3xl sm:text-4xl font-black text-[#f3e6c5] leading-none mt-1">
                    {tournament.tournamentNumber}
                  </span>
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#e0b66c] text-[#1a1208] text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wide">
                  1º Campeón
                </div>
              </div>

              <div
                className={`relative rounded-3xl border border-[#e0b66c]/20 bg-gradient-to-br from-[#2a1a14] via-[#24160f] to-[#1a1208] px-6 pt-20 pb-6 flex flex-col items-center text-center h-full overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:border-[#e0b66c]/40 ${
                  isHistorical ? 'opacity-85 border-[#e0b66c]/30' : ''
                }`}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(224,182,108,0.15),_transparent_60%)]" />
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
                    <h2 className="text-2xl font-semibold text-white drop-shadow-lg">
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
                    {renderPositionRow('Subcampeón', '2º', 'bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-[0_6px_16px_rgba(148,163,184,0.35)]', 'text-white/60', tournament.runnerUp)}
                    {renderPositionRow('Tercero', '3º', 'bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]', 'text-orange-200/80', tournament.thirdPlace)}
                    {renderPositionRow('Siete', '7º', 'bg-gradient-to-br from-rose-500 to-rose-400 text-white shadow-[0_6px_16px_rgba(244,63,94,0.35)]', 'text-rose-200/80', tournament.siete)}
                    {renderPositionRow('Dos', '2', 'bg-gradient-to-br from-purple-500 to-purple-400 text-white shadow-[0_6px_16px_rgba(168,85,247,0.35)]', 'text-purple-200/80', tournament.dos)}
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
