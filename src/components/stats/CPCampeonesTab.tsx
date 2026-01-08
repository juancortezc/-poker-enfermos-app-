'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

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

export default function CPCampeonesTab() {
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
        throw new Error('Error al cargar campeones')
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
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando campeones...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: '#E53935', fontSize: 'var(--cp-body-size)' }}>
          Error: {error}
        </p>
        <button
          onClick={fetchChampionsStats}
          className="mt-4 px-4 py-2 rounded-lg font-medium"
          style={{ background: '#E53935', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!championsData) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay datos de campeones
        </p>
      </div>
    )
  }

  // Sort: active first, then by championships count
  const activeChampions = championsData.top3.concat(championsData.others).filter(c => c.player.isActive)
  const historicalChampions = championsData.top3.concat(championsData.others).filter(c => !c.player.isActive)
  const allChampions = [...activeChampions, ...historicalChampions]

  const topThree = allChampions.slice(0, 3)
  const restChampions = allChampions.slice(3)

  const getPlayerName = (champion: ChampionData) => {
    return `${champion.player.firstName} ${champion.player.lastName}`
  }

  const getPlayerAlias = (champion: ChampionData) => {
    return champion.player.aliases && champion.player.aliases.length > 0 ? champion.player.aliases[0] : ''
  }

  const getPositionColor = (index: number) => {
    switch (index) {
      case 0: return '#fbbf24' // gold
      case 1: return '#94a3b8' // silver
      case 2: return '#f97316' // bronze
      default: return 'var(--cp-on-surface-muted)'
    }
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="flex justify-center items-end gap-3 py-4">
          {/* Second Place */}
          {topThree[1] && (
            <ChampionCard
              champion={topThree[1]}
              position={2}
              color={getPositionColor(1)}
              size="medium"
            />
          )}

          {/* First Place */}
          {topThree[0] && (
            <ChampionCard
              champion={topThree[0]}
              position={1}
              color={getPositionColor(0)}
              size="large"
            />
          )}

          {/* Third Place */}
          {topThree[2] && (
            <ChampionCard
              champion={topThree[2]}
              position={3}
              color={getPositionColor(2)}
              size="medium"
            />
          )}
        </div>
      )}

      {/* Rest of Champions */}
      {restChampions.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <div className="divide-y" style={{ borderColor: 'var(--cp-surface-border)' }}>
            {restChampions.map((champion, index) => (
              <div
                key={champion.player.id}
                className="flex items-center gap-3 p-3"
              >
                {/* Position */}
                <div
                  className="w-6 text-center font-medium"
                  style={{
                    fontSize: 'var(--cp-caption-size)',
                    color: 'var(--cp-on-surface-muted)',
                  }}
                >
                  {index + 4}
                </div>

                {/* Photo */}
                <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                  {champion.player.photoUrl ? (
                    <Image
                      src={champion.player.photoUrl}
                      alt={getPlayerName(champion)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        color: 'white',
                      }}
                    >
                      {champion.player.firstName.charAt(0)}
                      {champion.player.lastName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{
                      fontSize: 'var(--cp-caption-size)',
                      color: 'var(--cp-on-surface)',
                    }}
                  >
                    {getPlayerName(champion)}
                  </p>
                  {getPlayerAlias(champion) && (
                    <p
                      className="truncate"
                      style={{
                        fontSize: '10px',
                        color: '#f97316',
                      }}
                    >
                      ({getPlayerAlias(champion)})
                    </p>
                  )}
                </div>

                {/* Championships Count */}
                <div
                  className="px-3 py-1 rounded-lg font-bold"
                  style={{
                    background: '#fbbf2420',
                    color: '#fbbf24',
                    fontSize: 'var(--cp-body-size)',
                  }}
                >
                  {champion.championshipsCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ChampionCardProps {
  champion: ChampionData
  position: number
  color: string
  size: 'large' | 'medium'
}

function ChampionCard({ champion, position, color, size }: ChampionCardProps) {
  const isLarge = size === 'large'
  const cardSize = isLarge ? 'w-28 h-36' : 'w-24 h-32'
  const photoSize = isLarge ? 'w-16 h-16' : 'w-12 h-12'

  const getPlayerName = () => `${champion.player.firstName}`
  const getAlias = () => champion.player.aliases && champion.player.aliases.length > 0 ? champion.player.aliases[0] : ''

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${cardSize} rounded-2xl relative overflow-hidden flex flex-col items-center justify-end p-3`}
        style={{
          background: 'var(--cp-surface)',
          border: `2px solid ${color}40`,
        }}
      >
        {/* Position Badge */}
        <div
          className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: color, color: '#000' }}
        >
          {position}
        </div>

        {/* Photo */}
        <div className={`${photoSize} rounded-full overflow-hidden border-2 mb-2`} style={{ borderColor: color }}>
          {champion.player.photoUrl ? (
            <Image
              src={champion.player.photoUrl}
              alt={getPlayerName()}
              fill
              className="object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg"
              style={{ background: `${color}30` }}
            >
              🏆
            </div>
          )}
        </div>

        {/* Name */}
        <p
          className="font-semibold text-center truncate w-full"
          style={{
            fontSize: isLarge ? 'var(--cp-caption-size)' : '11px',
            color: 'var(--cp-on-surface)',
          }}
        >
          {getPlayerName()}
        </p>
        {getAlias() && (
          <p
            className="truncate w-full text-center"
            style={{ fontSize: '9px', color: '#f97316' }}
          >
            ({getAlias()})
          </p>
        )}
      </div>

      {/* Championships Count */}
      <div
        className="mt-2 px-3 py-1 rounded-full font-bold"
        style={{
          background: `${color}20`,
          color: color,
          fontSize: 'var(--cp-body-size)',
        }}
      >
        {champion.championshipsCount}
      </div>
    </div>
  )
}
