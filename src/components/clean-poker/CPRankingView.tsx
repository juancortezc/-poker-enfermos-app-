'use client'

import { useState } from 'react'
import Image from 'next/image'
import { TrendingUp, TrendingDown, Minus, User, RotateCw } from 'lucide-react'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import { CPPlayerDetailModal } from './CPPlayerDetailModal'
import type { PlayerRanking } from '@/lib/ranking-utils'

interface CPRankingViewProps {
  tournamentId: number
}

// Mini card for top 3 podium
function PodiumMiniCard({
  player,
  position,
  onClick
}: {
  player: PlayerRanking
  position: 1 | 2 | 3
  onClick: () => void
}) {
  const getMedalColor = () => {
    if (position === 1) return '#FFD700' // Oro
    if (position === 2) return '#C0C0C0' // Plata
    return '#CD7F32' // Bronce
  }

  const getTrendInfo = () => {
    if (player.trend === 'up') return { color: '#4CAF50', icon: <TrendingUp className="w-3 h-3" /> }
    if (player.trend === 'down') return { color: '#E53935', icon: <TrendingDown className="w-3 h-3" /> }
    return { color: '#FFC107', icon: <Minus className="w-3 h-3" /> }
  }

  const trendInfo = getTrendInfo()
  const medalColor = getMedalColor()

  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-xl p-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${medalColor}40`,
      }}
    >
      {/* Avatar */}
      <div className="flex justify-center mb-2">
        <div
          className="rounded-full overflow-hidden flex items-center justify-center"
          style={{
            width: position === 1 ? 56 : 48,
            height: position === 1 ? 56 : 48,
            background: player.playerPhoto ? 'transparent' : 'var(--cp-surface-solid)',
            border: `2px solid ${medalColor}`,
          }}
        >
          {player.playerPhoto ? (
            <Image
              src={player.playerPhoto}
              alt={player.playerName}
              width={position === 1 ? 56 : 48}
              height={position === 1 ? 56 : 48}
              className="object-cover w-full h-full"
            />
          ) : (
            <User className="w-5 h-5" style={{ color: 'var(--cp-on-surface-variant)' }} />
          )}
        </div>
      </div>

      {/* Position */}
      <p
        className="text-center font-bold mb-1"
        style={{ fontSize: '14px', color: medalColor }}
      >
        #{position}
      </p>

      {/* Name */}
      <p
        className="text-center font-medium truncate mb-1"
        style={{ fontSize: '12px', color: 'var(--cp-on-surface)' }}
      >
        {player.playerName.split(' ')[0]}
      </p>

      {/* Points */}
      <p
        className="text-center font-bold"
        style={{ fontSize: '16px', color: 'var(--cp-on-surface)' }}
      >
        {player.finalScore ?? player.totalPoints}
      </p>

      {/* Trend */}
      <div className="flex items-center justify-center gap-1 mt-1">
        <span style={{ color: trendInfo.color }}>{trendInfo.icon}</span>
        <span style={{ fontSize: '10px', color: trendInfo.color }}>
          {Math.abs(player.positionsChanged)}
        </span>
      </div>
    </button>
  )
}

// Row for middle players (positions 4+)
function PlayerRow({
  player,
  onClick,
  isMalazo = false
}: {
  player: PlayerRanking
  onClick: () => void
  isMalazo?: boolean
}) {
  const getTrendInfo = () => {
    if (player.trend === 'up') return { color: '#4CAF50', icon: <TrendingUp className="w-3 h-3" /> }
    if (player.trend === 'down') return { color: '#E53935', icon: <TrendingDown className="w-3 h-3" /> }
    return { color: '#FFC107', icon: <Minus className="w-3 h-3" /> }
  }

  const trendInfo = getTrendInfo()
  const borderColor = isMalazo ? '#EC407A' : 'rgba(255, 255, 255, 0.06)'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5"
      style={{
        background: isMalazo ? 'rgba(236, 64, 122, 0.1)' : 'rgba(0, 0, 0, 0.2)',
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Position */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0"
        style={{
          background: isMalazo ? 'rgba(236, 64, 122, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          fontSize: '12px',
          color: isMalazo ? '#EC407A' : 'var(--cp-on-surface-variant)',
        }}
      >
        {player.position}
      </div>

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{
          background: player.playerPhoto ? 'transparent' : 'var(--cp-surface-solid)',
          border: `1px solid ${isMalazo ? '#EC407A40' : 'rgba(255, 255, 255, 0.1)'}`,
        }}
      >
        {player.playerPhoto ? (
          <Image
            src={player.playerPhoto}
            alt={player.playerName}
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        ) : (
          <User className="w-4 h-4" style={{ color: 'var(--cp-on-surface-variant)' }} />
        )}
      </div>

      {/* Name & Trend */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium truncate"
          style={{ fontSize: '14px', color: 'var(--cp-on-surface)' }}
        >
          {player.playerName}
        </p>
        <div className="flex items-center gap-1">
          <span style={{ color: trendInfo.color }}>{trendInfo.icon}</span>
          <span style={{ fontSize: '10px', color: trendInfo.color }}>
            {player.positionsChanged === 0 ? '-' : Math.abs(player.positionsChanged)}
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <p
          className="font-bold"
          style={{ fontSize: '16px', color: isMalazo ? '#EC407A' : 'var(--cp-on-surface)' }}
        >
          {player.finalScore ?? player.totalPoints}
        </p>
        <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>
          total {player.totalPoints}
        </p>
      </div>
    </button>
  )
}

export function CPRankingView({ tournamentId }: CPRankingViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const {
    ranking: rankingData,
    isLoading,
    isError,
    errorMessage,
    refresh
  } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton for podium */}
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="flex-1 h-32 rounded-xl animate-pulse"
              style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            />
          ))}
        </div>
        {/* Skeleton for rows */}
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse"
            style={{ background: 'rgba(0, 0, 0, 0.2)' }}
          />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <p style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
          Error al cargar el ranking
        </p>
        <p className="mt-1" style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
          {errorMessage}
        </p>
        <button
          onClick={() => refresh()}
          className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-full transition-all hover:bg-white/10"
          style={{
            border: '1px solid var(--cp-primary)',
            color: 'var(--cp-primary)',
            fontSize: '12px',
          }}
        >
          <RotateCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    )
  }

  if (!rankingData || rankingData.rankings.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <p style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface-muted)' }}>
          No hay datos de ranking disponibles.
        </p>
      </div>
    )
  }

  const { rankings, tournament } = rankingData
  const top3 = rankings.slice(0, 3)
  const middle = rankings.slice(3, -2)
  const bottom2 = rankings.length > 2 ? rankings.slice(-2) : []

  // Reorder top3: 2nd, 1st, 3rd
  const orderedTop3 = [
    top3.find(p => p.position === 2),
    top3.find(p => p.position === 1),
    top3.find(p => p.position === 3),
  ].filter(Boolean) as PlayerRanking[]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <p style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-variant)' }}>
          Torneo #{tournament.number}
        </p>
        <p style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface-muted)' }}>
          {tournament.completedDates}/{tournament.totalDates} fechas
        </p>
      </div>

      {/* Top 3 Podium - 2nd, 1st, 3rd */}
      <div className="flex gap-2 items-end">
        {orderedTop3.map((player) => (
          <PodiumMiniCard
            key={player.playerId}
            player={player}
            position={player.position as 1 | 2 | 3}
            onClick={() => setSelectedPlayerId(player.playerId)}
          />
        ))}
      </div>

      {/* Middle players */}
      {middle.length > 0 && (
        <div className="space-y-2">
          {middle.map(player => (
            <PlayerRow
              key={player.playerId}
              player={player}
              onClick={() => setSelectedPlayerId(player.playerId)}
            />
          ))}
        </div>
      )}

      {/* Bottom 2 - Malazos */}
      {bottom2.length > 0 && (
        <div className="space-y-2 mt-4">
          <p
            className="text-center"
            style={{ fontSize: 'var(--cp-caption-size)', color: '#EC407A' }}
          >
            7/2
          </p>
          {bottom2.map(player => (
            <PlayerRow
              key={player.playerId}
              player={player}
              onClick={() => setSelectedPlayerId(player.playerId)}
              isMalazo
            />
          ))}
        </div>
      )}

      {/* Player Detail Modal */}
      <CPPlayerDetailModal
        isOpen={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        playerId={selectedPlayerId || ''}
        tournamentId={tournamentId}
      />
    </div>
  )
}

export default CPRankingView
