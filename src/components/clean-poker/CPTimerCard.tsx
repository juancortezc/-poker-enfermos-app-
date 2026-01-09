'use client'

import { Timer } from 'lucide-react'
import { useTimerState } from '@/hooks/useTimerState'
import { useTimerAutoAdvance } from '@/hooks/useTimerAutoAdvance'

export function CPTimerCard() {
  const {
    timerState,
    currentBlindLevel,
    nextBlindLevel,
    formattedTimeRemaining,
    displayTimeRemaining,
    isLoading,
    isPaused
  } = useTimerState()

  // Hook para auto-avance y notificaciones
  useTimerAutoAdvance()

  if (isLoading) {
    return (
      <div
        className="cp-card p-4 animate-pulse"
        style={{ borderLeft: '3px solid var(--cp-primary)' }}
      >
        <div className="h-16 rounded-lg" style={{ background: 'var(--cp-surface-solid)' }} />
      </div>
    )
  }

  if (!timerState || !currentBlindLevel) {
    return null
  }

  const isCritical = displayTimeRemaining > 0 && displayTimeRemaining <= 60
  const isUnlimited = currentBlindLevel.duration === 0

  return (
    <div
      className="cp-card p-4 relative overflow-hidden"
      style={{
        borderLeft: `3px solid ${isPaused ? 'var(--cp-warning)' : 'var(--cp-primary)'}`
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute top-0 left-0 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-20"
        style={{ background: isPaused ? 'var(--cp-warning)' : 'var(--cp-primary)' }}
      />

      <div className="flex items-center relative">
        {/* Left: Timer info */}
        <div className="flex items-center gap-4">
          {/* Timer icon with status */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: isPaused ? 'var(--cp-warning)' : 'var(--cp-primary)',
              opacity: 0.15
            }}
          >
            <Timer
              className="w-6 h-6"
              style={{ color: isPaused ? 'var(--cp-warning)' : 'var(--cp-primary)' }}
            />
          </div>

          {/* Time and blinds */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono font-bold ${isCritical ? 'animate-pulse' : ''}`}
                style={{
                  fontSize: '1.5rem',
                  color: isCritical ? 'var(--cp-negative)' : 'var(--cp-on-surface)'
                }}
              >
                {isUnlimited ? 'SIN LÍMITE' : formattedTimeRemaining}
              </span>
              {isPaused && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold uppercase"
                  style={{
                    background: 'var(--cp-warning)',
                    color: 'var(--cp-on-primary)'
                  }}
                >
                  Pausado
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 'var(--cp-body-size)',
                color: 'var(--cp-on-surface-variant)'
              }}
            >
              Blinds: {currentBlindLevel.smallBlind}/{currentBlindLevel.bigBlind}
              {nextBlindLevel && (
                <span style={{ color: 'var(--cp-on-surface-muted)' }}>
                  {' → '}{nextBlindLevel.smallBlind}/{nextBlindLevel.bigBlind}
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
