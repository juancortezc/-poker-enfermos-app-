'use client'

import { Timer } from 'lucide-react'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { usePokerTimer } from '@/hooks/usePokerTimer'

export function CPTimerCard() {
  const { gameDate } = useActiveGameDate({ refreshInterval: 30000 })
  const timer = usePokerTimer(gameDate?.id ?? null)

  if (timer.isLoading) {
    return (
      <div
        className="cp-card p-4 animate-pulse"
        style={{ borderLeft: '3px solid var(--cp-primary)' }}
      >
        <div className="h-16 rounded-lg" style={{ background: 'var(--cp-surface-solid)' }} />
      </div>
    )
  }

  if (!gameDate || timer.status === 'inactive' || timer.status === 'completed') {
    return null
  }

  const isPaused = timer.status === 'paused'
  const isUnlimited = timer.currentBlind?.duration === 0
  const isBreak = timer.currentBlind?.smallBlind === 0 && timer.currentBlind?.bigBlind === 0
  const accentColor = isPaused ? 'var(--cp-warning)' : 'var(--cp-primary)'

  return (
    <div
      className="cp-card p-4 relative overflow-hidden"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Glow effect */}
      <div
        className="absolute top-0 left-0 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-20"
        style={{ background: accentColor }}
      />

      <div className="flex items-center relative">
        <div className="flex items-center gap-4">
          {/* Timer icon */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: accentColor, opacity: 0.15 }}
          >
            <Timer className="w-6 h-6" style={{ color: accentColor }} />
          </div>

          {/* Time and blinds */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono font-bold ${timer.isCritical ? 'animate-pulse' : ''}`}
                style={{
                  fontSize: '1.5rem',
                  color: timer.isCritical ? 'var(--cp-primary)' : 'var(--cp-on-surface)',
                }}
              >
                {isUnlimited ? 'SIN LÍMITE' : timer.formattedTime}
              </span>
              {isPaused && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold uppercase"
                  style={{ background: 'var(--cp-warning)', color: 'var(--cp-on-primary)' }}
                >
                  Pausado
                </span>
              )}
            </div>
            <p style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface-variant)' }}>
              {isBreak ? 'Descanso' : `Nivel ${timer.currentLevel}`}
              {!isBreak && timer.currentBlind && `: ${timer.currentBlind.smallBlind}/${timer.currentBlind.bigBlind}`}
              {!isBreak && timer.nextBlind && (
                <span style={{ color: 'var(--cp-on-surface-muted)' }}>
                  {' → '}
                  {timer.nextBlind.smallBlind === 0 ? 'Descanso' : `${timer.nextBlind.smallBlind}/${timer.nextBlind.bigBlind}`}
                </span>
              )}
              {isBreak && timer.nextBlind && (
                <span style={{ color: 'var(--cp-on-surface-muted)' }}>
                  {' → '}{timer.nextBlind.smallBlind}/{timer.nextBlind.bigBlind}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CPTimerCard
