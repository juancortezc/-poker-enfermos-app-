'use client'

import { Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

interface Player {
  position: 1 | 2 | 3
  name: string
  points: number
  trend?: number // +1, -1, 0
}

interface Top3CardProps {
  players: Player[]
  linkHref?: string
}

const MEDALS: Record<1 | 2 | 3, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉'
}

export function Top3Card({ players, linkHref = '/ranking' }: Top3CardProps) {
  const getTrendIcon = (trend?: number) => {
    if (!trend) return null
    if (trend > 0) {
      return <TrendingUp className="w-3.5 h-3.5 text-[var(--cp-success)]" />
    }
    if (trend < 0) {
      return <TrendingDown className="w-3.5 h-3.5 text-[var(--cp-on-surface-variant)]" />
    }
    return null
  }

  return (
    <div
      className="rounded-[var(--cp-radius-lg)] p-4"
      style={{
        backgroundColor: 'var(--cp-surface-container)',
        border: '1px solid var(--cp-outline-variant)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: 'var(--cp-gold)' }} />
          <span
            className="text-[var(--cp-title-medium)] font-semibold"
            style={{ color: 'var(--cp-on-surface)' }}
          >
            Top 3
          </span>
        </div>
        <Link
          href={linkHref}
          className="text-[var(--cp-label-medium)] font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--cp-primary)' }}
        >
          Ver Ranking &gt;
        </Link>
      </div>

      {/* Divider */}
      <div
        className="h-px mb-3"
        style={{ backgroundColor: 'var(--cp-outline-variant)' }}
      />

      {/* Players List */}
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.position}
            className="flex items-center gap-3 py-1"
          >
            {/* Position */}
            <span
              className="text-[var(--cp-title-medium)] font-semibold w-5"
              style={{ color: 'var(--cp-on-surface-variant)' }}
            >
              {player.position}
            </span>

            {/* Medal */}
            <span className="text-lg">{MEDALS[player.position]}</span>

            {/* Name */}
            <span
              className="text-[var(--cp-body-large)] flex-grow"
              style={{ color: 'var(--cp-on-surface)' }}
            >
              {player.name}
            </span>

            {/* Points */}
            <span
              className="text-[var(--cp-title-medium)] font-semibold"
              style={{ color: 'var(--cp-on-surface-variant)' }}
            >
              {player.points} pts
            </span>

            {/* Trend */}
            {getTrendIcon(player.trend)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Top3Card
