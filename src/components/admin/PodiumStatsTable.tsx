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

  const getRowBackgroundClass = (stat: PodiumStat, index: number) => {
    // Destacar los primeros 3 lugares
    if (index === 0) return 'bg-yellow-500/10' // Oro
    if (index === 1) return 'bg-gray-400/10'   // Plata
    if (index === 2) return 'bg-orange-500/10' // Bronce
    return index % 2 === 1 ? 'bg-gray-50' : ''
  }

  const getTextColorClass = (stat: PodiumStat, index: number) => {
    if (index === 0) return 'text-yellow-600 font-bold'
    if (index === 1) return 'text-gray-600 font-semibold'
    if (index === 2) return 'text-orange-600 font-semibold'
    return 'text-black'
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Cargando estadísticas de podios..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={fetchPodiumStats}
            className="px-4 py-2 bg-poker-red text-white rounded hover:bg-red-700 transition-colors"
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
        <div className="text-center py-8">
          <p className="text-poker-muted">No hay datos de podios</p>
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
    <div className="w-full p-6">
      {/* Top 3 Podium Leaders - Podium style */}
      {topThree.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-center items-center gap-2 sm:gap-3">
            {topThree.map((stat, index) => {
              const isFirst = index === 0
              const isSecond = index === 1
              const isThird = index === 2
              
              return (
                <div
                  key={stat.player.id}
                  className="relative flex flex-col items-center"
                >
                  {/* Card del podio */}
                  <div 
                    className={`relative dashboard-card rounded-lg p-3 w-24 sm:w-28 h-32 sm:h-36 cursor-pointer hover:scale-105 transition-transform duration-200 ${
                      !stat.player.isActive ? 'border-2 border-gray-400' : ''
                    }`}
                    onClick={() => openPlayerModal(stat.player.id)}
                  >
                    {/* Círculo de posición */}
                    <div className={`
                      absolute -top-2 -left-2 w-8 h-8 rounded-full 
                      flex items-center justify-center font-bold text-sm z-10
                      ${getPositionColor(index)}
                    `}>
                      {index + 1}
                    </div>

                    {/* Foto como fondo del card */}
                    {stat.player.photoUrl ? (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <img
                          src={stat.player.photoUrl}
                          alt={formatPlayerName(stat.player)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className={`
                        absolute inset-0 rounded-lg
                        ${isFirst 
                          ? 'bg-gradient-to-br from-yellow-900/40 via-yellow-700/30 to-yellow-500/20' 
                          : isSecond 
                          ? 'bg-gradient-to-br from-gray-600/40 via-gray-500/30 to-gray-400/20' 
                          : 'bg-gradient-to-br from-orange-900/40 via-orange-700/30 to-orange-500/20'
                        }
                      `} />
                    )}

                    {/* Contenido sobre la foto */}
                    <div className="relative flex flex-col items-center justify-end h-full pb-2">
                      {/* Si no hay foto, mostrar icono */}
                      {!stat.player.photoUrl && (
                        <div className="mb-auto mt-4">
                          <div className="w-12 sm:w-16 h-12 sm:h-16 text-white/50 flex items-center justify-center text-2xl">
                            🏆
                          </div>
                        </div>
                      )}

                      {/* Nombre en la base */}
                      <h3 className="text-white font-bold text-xs sm:text-sm text-center drop-shadow-lg">
                        {formatPlayerName(stat.player).split(' ')[0]}
                      </h3>
                      {getPlayerAlias(stat.player) && (
                        <div className="text-xs text-orange-400 mt-1">
                          ({getPlayerAlias(stat.player)})
                        </div>
                      )}
                      {!stat.player.isActive && (
                        <div className="text-xs text-gray-400 mt-1">
                          Histórico
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Podios bajo la foto */}
                  <div className="text-right mt-1">
                    <div className="flex flex-col items-end">
                      <span className="text-orange-400 font-bold text-sm">{stat.totalPodiums}</span>
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
              const firstName = formatPlayerName(stat.player).split(' ')[0]
              const position = topThree.length + index + 1
              
              return (
                <div
                  key={stat.player.id}
                  className={`relative dashboard-card rounded-lg p-2 cursor-pointer hover:scale-105 transition-transform duration-200 ${
                    !stat.player.isActive ? 'border-2 border-gray-400' : ''
                  }`}
                  onClick={() => openPlayerModal(stat.player.id)}
                >
                  {/* Círculo de posición */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs border border-white/20 shadow-md">
                    {position}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 h-full">
                    <div>
                      <h4 className="font-semibold text-white text-xs">
                        {firstName}
                      </h4>
                      {getPlayerAlias(stat.player) && (
                        <p className="text-orange-400 text-xs">
                          ({getPlayerAlias(stat.player)})
                        </p>
                      )}
                      {!stat.player.isActive && (
                        <p className="text-gray-400 text-xs">
                          Histórico
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-orange-400 font-bold text-sm">{stat.totalPodiums}</span>
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