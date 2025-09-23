'use client'

import { useState, useEffect } from 'react'
import LoadingState from '@/components/ui/LoadingState'
import ChampionCard from './ChampionCard'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string
  isActive: boolean
  aliases: string[]
}

interface ChampionData {
  player: Player
  championshipsCount: number
  tournamentNumbers: number[]
}

interface ChampionsStats {
  top3: ChampionData[]
  others: ChampionData[]
  totalChampions: number
  totalChampionships: number
}

export default function ChampionsCards() {
  const [championsData, setChampionsData] = useState<ChampionsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChampionsStats()
  }, [])

  const fetchChampionsStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/champions-stats')
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas de campeones')
      }

      const result = await response.json()
      
      if (result.success) {
        setChampionsData(result.data)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Cargando estadísticas de campeones..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={fetchChampionsStats}
            className="px-4 py-2 bg-poker-red text-white rounded hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!championsData) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-poker-muted">No hay datos de campeones</p>
        </div>
      </div>
    )
  }

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return '🏆'
    }
  }

  // Separate champions by active status and sort them
  const activeChampions = championsData.top3.concat(championsData.others).filter(c => c.player.isActive)
  const historicalChampions = championsData.top3.concat(championsData.others).filter(c => !c.player.isActive)
  
  // Combine active first, then historical
  const allChampions = [...activeChampions, ...historicalChampions]
  
  // Split into layout sections - top 3 podium, rest in grid
  const topThree = allChampions.slice(0, 3)
  const gridChampions = allChampions.slice(3) // All remaining champions in grid

  const getPlayerName = (champion: ChampionData) => {
    return `${champion.player.firstName} ${champion.player.lastName}`
  }

  const getPlayerAlias = (champion: ChampionData) => {
    return champion.player.aliases && champion.player.aliases.length > 0 ? champion.player.aliases[0] : ''
  }

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
      {/* Top 3 Podium - Similar to home page */}
      {topThree.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-center items-center gap-2 sm:gap-3">
            {topThree.map((champion, index) => {
              const isFirst = index === 0
              const isSecond = index === 1
              const isThird = index === 2
              
              return (
                <div
                  key={champion.player.id}
                  className="relative flex flex-col items-center"
                >
                  {/* Card del podio */}
                  <div className={`relative dashboard-card rounded-lg p-3 w-24 sm:w-28 h-32 sm:h-36 cursor-pointer group ${
                    !champion.player.isActive ? 'border-2 border-gray-400' : ''
                  }`}>
                    {/* Círculo de posición */}
                    <div className={`
                      absolute -top-2 -left-2 w-8 h-8 rounded-full 
                      flex items-center justify-center font-bold text-sm z-10
                      ${getPositionColor(index)}
                    `}>
                      {index + 1}
                    </div>

                    {/* Tooltip con torneos ganados */}
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg border border-gray-600" style={{zIndex: 9999}}>
                      <div className="font-semibold mb-1">Campeón en:</div>
                      <div>T{champion.tournamentNumbers.join(', T')}</div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                      </div>
                    </div>

                    {/* Foto como fondo del card */}
                    {champion.player.photoUrl ? (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <img
                          src={champion.player.photoUrl}
                          alt={getPlayerName(champion)}
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
                      {!champion.player.photoUrl && (
                        <div className="mb-auto mt-4">
                          <div className="w-12 sm:w-16 h-12 sm:h-16 text-white/50 flex items-center justify-center">
                            🏆
                          </div>
                        </div>
                      )}

                      {/* Nombre en la base */}
                      <h3 className="text-white font-bold text-xs sm:text-sm text-center drop-shadow-lg">
                        {getPlayerName(champion).split(' ')[0]}
                      </h3>
                      {getPlayerAlias(champion) && (
                        <div className="text-xs text-orange-400 mt-1">
                          ({getPlayerAlias(champion)})
                        </div>
                      )}
                      {!champion.player.isActive && (
                        <div className="text-xs text-gray-400 mt-1">
                          Histórico
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Campeonatos bajo la foto */}
                  <div className="text-right mt-1">
                    <div className="flex flex-col items-end">
                      <span className="text-orange-400 font-bold text-sm">{champion.championshipsCount}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All remaining positions - Grid cards */}
      {gridChampions.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2 px-2">
            {gridChampions.map((champion, index) => {
              const firstName = getPlayerName(champion).split(' ')[0]
              const position = topThree.length + index + 1
              
              return (
                <div
                  key={champion.player.id}
                  className={`relative dashboard-card rounded-lg p-2 cursor-pointer group ${
                    !champion.player.isActive ? 'border-2 border-gray-400' : ''
                  }`}
                >
                  {/* Círculo de posición */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs border border-white/20 shadow-md">
                    {position}
                  </div>

                  {/* Tooltip con torneos ganados */}
                  <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg border border-gray-600" style={{zIndex: 9999}}>
                    <div className="font-semibold mb-1">Campeón en:</div>
                    <div>T{champion.tournamentNumbers.join(', T')}</div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 h-full">
                    <div>
                      <h4 className="font-semibold text-white text-xs">
                        {firstName}
                      </h4>
                      {getPlayerAlias(champion) && (
                        <p className="text-orange-400 text-xs">
                          ({getPlayerAlias(champion)})
                        </p>
                      )}
                      {!champion.player.isActive && (
                        <p className="text-gray-400 text-xs">
                          Histórico
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-orange-400 font-bold text-sm">{champion.championshipsCount}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}