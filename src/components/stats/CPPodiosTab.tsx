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

export default function CPPodiosTab() {
  const [podiumData, setPodiumData] = useState<PodiumStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPodiumStats()
  }, [])

  const fetchPodiumStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/podium-stats')

      if (!response.ok) {
        throw new Error('Error al cargar podios')
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

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando podios...</div>
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
          onClick={fetchPodiumStats}
          className="mt-4 px-4 py-2 rounded-lg font-medium"
          style={{ background: '#E53935', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!podiumData) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay datos de podios
        </p>
      </div>
    )
  }

  // Sort: active first, then by total podiums
  const activeStats = podiumData.players.filter(stat => stat.player.isActive)
  const historicalStats = podiumData.players.filter(stat => !stat.player.isActive)
  const allStats = [...activeStats, ...historicalStats]

  const topThree = allStats.slice(0, 3)
  const restStats = allStats.slice(3)

  const formatPlayerName = (player: Player) => `${player.firstName} ${player.lastName}`
  const getPlayerAlias = (player: Player) => player.aliases && player.aliases.length > 0 ? player.aliases[0] : ''

  const getPositionColor = (index: number) => {
    switch (index) {
      case 0: return '#fbbf24'
      case 1: return '#94a3b8'
      case 2: return '#f97316'
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
            <PodiumCard
              stat={topThree[1]}
              position={2}
              color={getPositionColor(1)}
              size="medium"
            />
          )}

          {/* First Place */}
          {topThree[0] && (
            <PodiumCard
              stat={topThree[0]}
              position={1}
              color={getPositionColor(0)}
              size="large"
            />
          )}

          {/* Third Place */}
          {topThree[2] && (
            <PodiumCard
              stat={topThree[2]}
              position={3}
              color={getPositionColor(2)}
              size="medium"
            />
          )}
        </div>
      )}

      {/* Table Header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        {/* Column Headers */}
        <div
          className="grid grid-cols-[1fr_40px_40px_40px_50px] gap-2 px-4 py-2"
          style={{ borderBottom: '1px solid var(--cp-surface-border)' }}
        >
          <span style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>JUGADOR</span>
          <span className="text-center" style={{ fontSize: '10px', color: '#fbbf24' }}>1ro</span>
          <span className="text-center" style={{ fontSize: '10px', color: '#94a3b8' }}>2do</span>
          <span className="text-center" style={{ fontSize: '10px', color: '#f97316' }}>3ro</span>
          <span className="text-center" style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>TOT</span>
        </div>

        {/* Rest of Players */}
        <div className="divide-y" style={{ borderColor: 'var(--cp-surface-border)' }}>
          {restStats.map((stat, index) => (
            <div
              key={stat.player.id}
              className="grid grid-cols-[1fr_40px_40px_40px_50px] gap-2 px-4 py-3 items-center"
            >
              {/* Player Info */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-5 text-center font-medium"
                  style={{
                    fontSize: '11px',
                    color: 'var(--cp-on-surface-muted)',
                  }}
                >
                  {index + 4}
                </span>

                <div className="relative w-8 h-8 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                  {stat.player.photoUrl ? (
                    <Image
                      src={stat.player.photoUrl}
                      alt={formatPlayerName(stat.player)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #E53935, #f97316)',
                        color: 'white',
                      }}
                    >
                      {stat.player.firstName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{
                      fontSize: 'var(--cp-caption-size)',
                      color: 'var(--cp-on-surface)',
                    }}
                  >
                    {formatPlayerName(stat.player)}
                  </p>
                  {getPlayerAlias(stat.player) && (
                    <p
                      className="truncate"
                      style={{ fontSize: '9px', color: '#f97316' }}
                    >
                      ({getPlayerAlias(stat.player)})
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <span
                className="text-center font-medium"
                style={{ fontSize: 'var(--cp-caption-size)', color: '#fbbf24' }}
              >
                {stat.firstPlaces}
              </span>
              <span
                className="text-center font-medium"
                style={{ fontSize: 'var(--cp-caption-size)', color: '#94a3b8' }}
              >
                {stat.secondPlaces}
              </span>
              <span
                className="text-center font-medium"
                style={{ fontSize: 'var(--cp-caption-size)', color: '#f97316' }}
              >
                {stat.thirdPlaces}
              </span>
              <span
                className="text-center font-bold"
                style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
              >
                {stat.totalPodiums}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PodiumCardProps {
  stat: PodiumStat
  position: number
  color: string
  size: 'large' | 'medium'
}

function PodiumCard({ stat, position, color, size }: PodiumCardProps) {
  const isLarge = size === 'large'
  // Increased by 50%: large w-28->w-42, h-40->h-60; medium w-24->w-36, h-36->h-54
  const cardSize = isLarge ? 'w-[168px] h-[240px]' : 'w-36 h-[216px]'
  const photoSize = isLarge ? 'w-20 h-20' : 'w-[72px] h-[72px]'

  const getPlayerName = () => `${stat.player.firstName}`
  const getAlias = () => stat.player.aliases && stat.player.aliases.length > 0 ? stat.player.aliases[0] : ''

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${cardSize} rounded-2xl relative overflow-hidden flex flex-col items-center justify-end p-4`}
        style={{
          background: 'var(--cp-surface)',
          border: `2px solid ${color}40`,
        }}
      >
        {/* Position Badge */}
        <div
          className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: color, color: '#000' }}
        >
          {position}
        </div>

        {/* Photo */}
        <div className={`${photoSize} rounded-full overflow-hidden border-2 mb-3 relative`} style={{ borderColor: color }}>
          {stat.player.photoUrl ? (
            <Image
              src={stat.player.photoUrl}
              alt={getPlayerName()}
              fill
              className="object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl"
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
            fontSize: isLarge ? 'var(--cp-body-size)' : 'var(--cp-caption-size)',
            color: 'var(--cp-on-surface)',
          }}
        >
          {getPlayerName()}
        </p>
        {getAlias() && (
          <p
            className="truncate w-full text-center"
            style={{ fontSize: isLarge ? '11px' : '10px', color: '#f97316' }}
          >
            ({getAlias()})
          </p>
        )}

        {/* Mini Stats */}
        <div className="flex gap-3 mt-2">
          <span style={{ fontSize: isLarge ? '13px' : '12px', color: '#fbbf24' }}>{stat.firstPlaces}</span>
          <span style={{ fontSize: isLarge ? '13px' : '12px', color: '#94a3b8' }}>{stat.secondPlaces}</span>
          <span style={{ fontSize: isLarge ? '13px' : '12px', color: '#f97316' }}>{stat.thirdPlaces}</span>
        </div>
      </div>

      {/* Total Podiums */}
      <div
        className="mt-3 px-4 py-1.5 rounded-full font-bold"
        style={{
          background: `${color}20`,
          color: color,
          fontSize: isLarge ? '18px' : 'var(--cp-body-size)',
        }}
      >
        {stat.totalPodiums}
      </div>
    </div>
  )
}
