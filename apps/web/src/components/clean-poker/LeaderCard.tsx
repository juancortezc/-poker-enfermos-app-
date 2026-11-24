'use client'

import { Trophy } from 'lucide-react'

interface LeaderCardProps {
  name: string
  points: number
  gamesPlayed: number
  totalGames: number
}

export function LeaderCard({
  name,
  points,
  gamesPlayed,
  totalGames
}: LeaderCardProps) {
  return (
    <div className="cp-card p-6 text-center">
      {/* Trophy Icon */}
      <div className="flex justify-center mb-3">
        <Trophy
          className="w-6 h-6"
          style={{ color: 'var(--cp-gold)' }}
        />
      </div>

      {/* Label */}
      <p
        className="font-medium uppercase tracking-wider mb-3"
        style={{
          fontSize: 'var(--cp-label-size)',
          color: 'var(--cp-on-surface-variant)'
        }}
      >
        Líder Actual
      </p>

      {/* Name */}
      <h3
        className="font-bold mb-2"
        style={{
          fontSize: 'var(--cp-title-size)',
          color: 'var(--cp-on-surface)'
        }}
      >
        {name}
      </h3>

      {/* Points */}
      <p
        className="font-semibold mb-3"
        style={{
          fontSize: 'var(--cp-body-size)',
          color: 'var(--cp-primary)'
        }}
      >
        {points} pts
      </p>

      {/* Progress */}
      <p
        style={{
          fontSize: 'var(--cp-caption-size)',
          color: 'var(--cp-on-surface-variant)'
        }}
      >
        {gamesPlayed} de {totalGames} fechas
      </p>
    </div>
  )
}

export default LeaderCard
