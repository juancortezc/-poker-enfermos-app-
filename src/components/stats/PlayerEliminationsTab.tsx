'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Target, Users, Calendar } from 'lucide-react'
import Image from 'next/image'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

interface PlayerStats {
  player: Player
  eliminationCount: number
}

interface PlayerStatsResponse {
  players: PlayerStats[]
  totalPlayers: number
}

interface EliminationDetail {
  dateNumber: number
  scheduledDate: string
  position: number
  gameDateId: number
}

interface VictimData {
  player: Player
  count: number
  eliminations: EliminationDetail[]
}

interface PlayerEliminationsData {
  eliminator: Player
  totalEliminations: number
  victims: VictimData[]
}

interface PlayerEliminationsTabProps {
  tournamentId: number
}

export default function PlayerEliminationsTab({ tournamentId }: PlayerEliminationsTabProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Fetch player stats ordered by elimination count
  const { data: playerStats, isLoading: playersLoading } = useSWR<PlayerStatsResponse>(
    `/api/stats/player-eliminations/${tournamentId}`
  )

  // Fetch eliminations data for selected player
  const { data: eliminationsData, isLoading: eliminationsLoading } = useSWR<PlayerEliminationsData>(
    selectedPlayerId ? `/api/stats/player-eliminations/${tournamentId}/${selectedPlayerId}` : null
  )

  if (playersLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (!playerStats || playerStats.players.length === 0) {
    return (
      <Card className="admin-card p-8 text-center">
        <p className="text-white/70">No se encontraron jugadores con eliminaciones en este torneo.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Player Selector */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="block text-xs uppercase tracking-[0.2em] text-white/60 mb-3">
          Seleccionar Jugador ({playerStats.totalPlayers})
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {playerStats.players.map((playerStat) => (
            <button
              key={playerStat.player.id}
              onClick={() => setSelectedPlayerId(playerStat.player.id)}
              className={`flex items-center gap-2 rounded-xl border p-2 transition-all hover:scale-[1.02] relative ${
                selectedPlayerId === playerStat.player.id
                  ? 'border-poker-red bg-poker-red/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {playerStat.player.photoUrl ? (
                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/20 flex-shrink-0">
                  <Image
                    src={playerStat.player.photoUrl}
                    alt={`${playerStat.player.firstName} ${playerStat.player.lastName}`}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 flex-shrink-0">
                  <Users className="h-4 w-4 text-white/60" />
                </div>
              )}
              <div className="flex-1 text-left truncate">
                <span className="text-xs font-medium text-white block truncate">
                  {playerStat.player.firstName}
                </span>
              </div>
              {/* Badge with elimination count */}
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-poker-red/20 flex-shrink-0">
                <span className="text-[10px] font-bold text-poker-red">{playerStat.eliminationCount}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Eliminations Data */}
      {selectedPlayerId && (
        <>
          {eliminationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : eliminationsData ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-poker-red/10 via-white/5 to-white/5 p-5">
                <div className="flex items-center gap-4">
                  {eliminationsData.eliminator.photoUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-poker-red/40">
                      <Image
                        src={eliminationsData.eliminator.photoUrl}
                        alt={`${eliminationsData.eliminator.firstName} ${eliminationsData.eliminator.lastName}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 border-2 border-poker-red/40">
                      <Users className="h-8 w-8 text-white/60" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">
                      {eliminationsData.eliminator.firstName} {eliminationsData.eliminator.lastName}
                    </h3>
                    <p className="text-sm text-white/70">
                      {eliminationsData.totalEliminations} eliminación{eliminationsData.totalEliminations !== 1 ? 'es' : ''} total{eliminationsData.totalEliminations !== 1 ? 'es' : ''}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      Ha eliminado a {eliminationsData.victims.length} jugador{eliminationsData.victims.length !== 1 ? 'es' : ''} diferente{eliminationsData.victims.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Victims List */}
              {eliminationsData.victims.length === 0 ? (
                <Card className="admin-card p-8 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50">
                      <Target className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Sin eliminaciones</h3>
                    <p className="text-gray-400 text-sm">
                      Este jugador no ha eliminado a nadie en este torneo.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-white/60 px-1">
                    Jugadores Eliminados ({eliminationsData.victims.length})
                  </h4>
                  {eliminationsData.victims.map((victim) => (
                    <div
                      key={victim.player.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      {/* Victim Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {victim.player.photoUrl ? (
                            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20">
                              <Image
                                src={victim.player.photoUrl}
                                alt={`${victim.player.firstName} ${victim.player.lastName}`}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                              <Users className="h-5 w-5 text-white/60" />
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">
                              {victim.player.firstName} {victim.player.lastName}
                            </p>
                            <p className="text-xs text-white/60">
                              {victim.count} vez{victim.count !== 1 ? 'ces' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-poker-red/20">
                          <span className="text-sm font-bold text-poker-red">{victim.count}</span>
                        </div>
                      </div>

                      {/* Elimination Details - Always Visible */}
                      <div className="space-y-2 border-t border-white/10 pt-3">
                        {victim.eliminations.map((elim, index) => (
                          <div
                            key={`${elim.gameDateId}-${index}`}
                            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-poker-red/20">
                                <Calendar className="h-4 w-4 text-poker-red" />
                              </div>
                              <p className="text-sm font-medium text-white">
                                Fecha #{elim.dateNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-white/50">Posición</p>
                              <p className="text-sm font-bold text-poker-red">#{elim.position}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="admin-card p-8 text-center">
              <p className="text-white/70">No se encontraron datos de eliminaciones.</p>
            </Card>
          )}
        </>
      )}

      {!selectedPlayerId && (
        <Card className="admin-card p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-poker-red/20">
              <Target className="w-8 h-8 text-poker-red" />
            </div>
            <h3 className="text-xl font-semibold text-white">Selecciona un jugador</h3>
            <p className="text-gray-400 text-sm">
              Elige un jugador para ver a quién ha eliminado y en qué fechas.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
