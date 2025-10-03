'use client'

import { useState, useEffect } from 'react'
import LoadingState from '@/components/ui/LoadingState'
import PodiumResultsModal from '@/components/tournaments/PodiumResultsModal'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string
  isActive: boolean
  aliases: string[]
}

interface PodiumStat {
  player: Player
  firstPlaces: number
  secondPlaces: number
  thirdPlaces: number
  totalPodiums: number
}

interface PodiumStatsData {
  players: PodiumStat[]
  summary: {
    totalPlayersInPodiums: number
    totalFirstPlaces: number
    totalSecondPlaces: number
    totalThirdPlaces: number
    totalPodiumAppearances: number
    averagePodiumsPerPlayer: number
  }
}

export default function PodiumStatsTable() {
  const [podiumData, setPodiumData] = useState<PodiumStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchPodiumStats()
  }, [])

  const fetchPodiumStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/podium-stats')
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas de podios')
      }

      const result = await response.json()
      
      if (result.success) {
        setPodiumData(result.data)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatPlayerName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`
  }

  const getPlayerAlias = (player: Player) => {
    return player.aliases && player.aliases.length > 0 ? player.aliases[0] : ''
  }

  const openPlayerModal = (playerId: string) => {
    setSelectedPlayerId(playerId)
    setIsModalOpen(true)
  }

  const closePlayerModal = () => {
    setIsModalOpen(false)
    setSelectedPlayerId(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/12 bg-white/5 p-8 text-center text-white/70">
          <LoadingState message="Cargando estadísticas de podios..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/20 via-[#1b1c2b] to-[#111221] p-8 text-center text-rose-100">
          <p className="mb-4 text-sm">Error: {error}</p>
          <button
            onClick={fetchPodiumStats}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-all hover:border-white/40 hover:text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!podiumData) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/12 bg-white/5 p-8 text-center text-white/65">
          <p>No hay datos de podios</p>
        </div>
      </div>
    )
  }

  // Sort players: active first, then historical
  const activeStats = podiumData.players.filter(stat => stat.player.isActive)
  const historicalStats = podiumData.players.filter(stat => !stat.player.isActive)
  const allStats = [...activeStats, ...historicalStats]
  
  // Split into layout sections - top 3 podium, rest in grid
  const topThree = allStats.slice(0, 3)
  const gridStats = allStats.slice(3)

  const getPositionColor = (index: number) => {
    switch (index + 1) {
      case 1: return 'position-1st'
      case 2: return 'position-2nd' 
      case 3: return 'position-3rd'
      default: return 'bg-black text-white border-white/20'
    }
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Top 3 Podium Leaders - Podium style */}
      {topThree.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {topThree.map((stat, index) => {
              const gradientClass = index === 0
                ? 'from-yellow-500/60 via-amber-400/20 to-yellow-300/10'
                : index === 1
                ? 'from-slate-500/60 via-slate-400/20 to-slate-300/10'
                : 'from-orange-500/60 via-orange-400/20 to-amber-300/10'

              return (
                <div key={stat.player.id} className="relative flex flex-col items-center">
                  <div
                    className={`group relative h-32 w-24 rounded-2xl border border-white/12 bg-gradient-to-br ${gradientClass} px-3 py-4 transition-transform duration-200 hover:-translate-y-1 sm:h-36 sm:w-28 ${
                      !stat.player.isActive ? 'opacity-85 border-white/20' : ''
                    }`}
                    onClick={() => openPlayerModal(stat.player.id)}
                  >
                    <div
                      className={`absolute -top-2 -left-2 flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${getPositionColor(index)}`}
                    >
                      {index + 1}
                    </div>

                    {stat.player.photoUrl ? (
                      <div className="absolute inset-0 overflow-hidden rounded-2xl">
                        <img
                          src={stat.player.photoUrl}
                          alt={formatPlayerName(stat.player)}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className={`absolute inset-0 rounded-2xl ${
                        index === 0
                          ? 'bg-gradient-to-br from-yellow-900/40 via-yellow-700/30 to-yellow-500/20'
                          : index === 1
                          ? 'bg-gradient-to-br from-gray-600/40 via-gray-500/30 to-gray-400/20'
                          : 'bg-gradient-to-br from-orange-900/40 via-orange-700/30 to-orange-500/20'
                      }`} />
                    )}

                    <div className="relative flex h-full flex-col items-center justify-end pb-2">
                      {!stat.player.photoUrl && (
                        <div className="mb-auto mt-4 flex h-12 w-12 items-center justify-center text-2xl text-white/60 sm:h-16 sm:w-16">
                          🏆
                        </div>
                      )}

                      <h3 className="text-center text-xs font-semibold text-white drop-shadow-lg sm:text-sm">
                        {formatPlayerName(stat.player)}
                      </h3>
                      {getPlayerAlias(stat.player) && (
                        <div className="mt-1 text-xs text-orange-400">
                          ({getPlayerAlias(stat.player)})
                        </div>
                      )}
                      {!stat.player.isActive && (
                        <div className="mt-1 text-xs text-white/45">Histórico</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-1 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-orange-400">{stat.totalPodiums}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All remaining players - Grid cards */}
      {gridStats.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2 px-2">
            {gridStats.map((stat, index) => {
              const position = topThree.length + index + 1

              return (
                <div
                  key={stat.player.id}
                  className={`group relative cursor-pointer rounded-2xl border border-white/12 bg-white/5 px-3 py-3 transition-transform duration-200 hover:-translate-y-1 ${
                    !stat.player.isActive ? 'opacity-85 border-white/20' : ''
                  }`}
                  onClick={() => openPlayerModal(stat.player.id)}
                >
                  <div className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black text-xs font-bold text-white shadow-md">
                    {position}
                  </div>

                  <div className="flex h-full items-center justify-between pt-2">
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        {formatPlayerName(stat.player)}
                      </h4>
                      {getPlayerAlias(stat.player) && (
                        <p className="text-xs text-orange-400">
                          ({getPlayerAlias(stat.player)})
                        </p>
                      )}
                      {!stat.player.isActive && (
                        <p className="text-xs text-white/45">Histórico</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-orange-400">{stat.totalPodiums}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Modal */}
      <PodiumResultsModal
        isOpen={isModalOpen}
        onClose={closePlayerModal}
        playerId={selectedPlayerId}
      />
    </div>
  )
}
