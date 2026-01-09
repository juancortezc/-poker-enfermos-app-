'use client'

import { useState, useEffect } from 'react'
import LoadingState from '@/components/ui/LoadingState'

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
        <div className="rounded-2xl border border-[#e0b66c]/20 bg-[#24160f]/40 p-8 text-center text-[#e8e3e3]">
          <LoadingState message="Cargando estadísticas de campeones..." />
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
            onClick={fetchChampionsStats}
            className="rounded-full border border-[#e0b66c]/30 bg-[#24160f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e8e3e3] transition-all hover:border-[#e0b66c]/50 hover:text-[#f3e6c5]"
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
        <div className="rounded-2xl border border-[#e0b66c]/20 bg-[#24160f]/40 p-8 text-center text-[#e8e3e3]">
          <p>No hay datos de campeones</p>
        </div>
      </div>
    )
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
    <div className="w-full space-y-6 p-6">
      {/* Top 3 Podium - Similar to home page */}
      {topThree.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-center items-center gap-2 sm:gap-3">
            {topThree.map((champion, index) => {
              const isFirst = index === 0
              const isSecond = index === 1
              const isThird = index === 2
              const gradientClass = isFirst
                ? 'from-[#e0b66c]/60 via-[#d4a053]/20 to-[#c48b3c]/10'
                : isSecond
                ? 'from-[#8d7052]/60 via-[#7a5f44]/20 to-[#6b5238]/10'
                : 'from-[#a9441c]/60 via-[#8d3717]/20 to-[#7a2f14]/10'
              
              return (
                <div
                  key={champion.player.id}
                  className="relative flex flex-col items-center"
                >
                  {/* Card del podio */}
                  <div
                    className={`group relative w-24 sm:w-28 h-32 sm:h-36 rounded-2xl border border-[#e0b66c]/20 bg-gradient-to-br ${gradientClass} px-3 py-4 transition-transform duration-200 hover:-translate-y-1 ${
                      !champion.player.isActive ? 'opacity-85 border-[#e0b66c]/30' : ''
                    }`}
                  >
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
                      <div className="absolute inset-0 overflow-hidden rounded-2xl">
                        <img
                          src={champion.player.photoUrl}
                          alt={getPlayerName(champion)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className={`
                        absolute inset-0 rounded-2xl
                        ${isFirst 
                          ? 'bg-gradient-to-br from-yellow-900/40 via-yellow-700/30 to-yellow-500/20' 
                          : isSecond 
                          ? 'bg-gradient-to-br from-gray-600/40 via-gray-500/30 to-gray-400/20' 
                          : 'bg-gradient-to-br from-orange-900/40 via-orange-700/30 to-orange-500/20'
                        }
                      `} />
                    )}

                    {/* Contenido sobre la foto */}
                    <div className="relative flex h-full flex-col items-center justify-end pb-2">
                      {/* Si no hay foto, mostrar icono */}
                      {!champion.player.photoUrl && (
                        <div className="mb-auto mt-4">
                          <div className="flex h-12 w-12 items-center justify-center text-white/60 sm:h-16 sm:w-16">
                            🏆
                          </div>
                        </div>
                      )}

                      {/* Nombre en la base */}
                      <h3 className="text-white font-bold text-xs sm:text-sm text-center drop-shadow-lg">
                        {getPlayerName(champion).split(' ')[0]}
                      </h3>
                      {getPlayerAlias(champion) && (
                        <div className="text-xs text-[#e0b66c] mt-1">
                          ({getPlayerAlias(champion)})
                        </div>
                      )}
                      {!champion.player.isActive && (
                        <div className="text-xs text-[#8d7052] mt-1">
                          Histórico
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campeonatos bajo la foto */}
                  <div className="text-right mt-1">
                    <div className="flex flex-col items-end">
                      <span className="text-[#e0b66c] font-bold text-sm">{champion.championshipsCount}</span>
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
                  className={`group relative rounded-2xl border border-white/12 bg-white/5 px-3 py-3 transition-transform duration-200 hover:-translate-y-1 ${
                    !champion.player.isActive ? 'opacity-85 border-white/20' : ''
                  }`}
                >
                  {/* Círculo de posición */}
                  <div className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black text-xs font-bold text-white shadow-md">
                    {position}
                  </div>

                  {/* Tooltip con torneos ganados */}
                  <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 rounded-lg border border-white/20 bg-black px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100" style={{zIndex: 9999}}>
                    <div className="font-semibold mb-1">Campeón en:</div>
                    <div>T{champion.tournamentNumbers.join(', T')}</div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 h-full">
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        {firstName}
                      </h4>
                      {getPlayerAlias(champion) && (
                        <p className="text-xs text-orange-400">
                          ({getPlayerAlias(champion)})
                        </p>
                      )}
                      {!champion.player.isActive && (
                        <p className="text-xs text-white/45">
                          Histórico
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-orange-400">{champion.championshipsCount}</span>
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
