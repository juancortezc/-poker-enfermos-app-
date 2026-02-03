'use client'

import { Timer, WifiOff } from 'lucide-react'
import { useTimerSSE } from '@/hooks/useTimerSSE'

export function CPTimerCard() {
  const {
    data,
    isConnected,
    isLoading,
    error,
    formattedTime,
    isPaused,
    reconnect
  } = useTimerSSE()

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

  if (error) {
    return (
      <div
        className="cp-card p-4"
        style={{ borderLeft: '3px solid var(--cp-negative)' }}
      >
        <div className="flex items-center gap-3">
          <WifiOff className="w-5 h-5" style={{ color: 'var(--cp-negative)' }} />
          <div>
            <p style={{ color: 'var(--cp-negative)', fontSize: 'var(--cp-body-size)' }}>
              {error}
            </p>
            <button
              onClick={reconnect}
              className="text-sm underline mt-1"
              style={{ color: 'var(--cp-primary)' }}
            >
              Reintentar conexión
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.status === 'inactive' || data.status === 'completed') {
    return null
  }

  const isCritical = data.timeRemaining > 0 && data.timeRemaining <= 60
  const isUnlimited = data.timeRemaining === 0 && data.nextLevel === null

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

      {/* Connection indicator */}
      {!isConnected && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--cp-warning)' }}
          title="Reconectando..."
        />
      )}

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
                {isUnlimited ? 'SIN LÍMITE' : formattedTime}
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
              Nivel {data.currentLevel}: {data.smallBlind}/{data.bigBlind}
              {data.nextSmallBlind !== null && data.nextBigBlind !== null && (
                <span style={{ color: 'var(--cp-on-surface-muted)' }}>
                  {' → '}{data.nextSmallBlind}/{data.nextBigBlind}
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
