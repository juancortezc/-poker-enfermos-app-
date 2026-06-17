'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { usePokerTimer } from '@/hooks/usePokerTimer'

export default function TimerPage() {
  const { user } = useAuth()
  const { gameDate } = useActiveGameDate({ refreshInterval: 30000 })
  const timer = usePokerTimer(gameDate?.id ?? null)
  const [actionLoading, setActionLoading] = useState<'pause' | 'resume' | 'reset' | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Keep screen awake
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake lock not supported or denied — silent fail
      }
    }
    requestWakeLock()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLockRef.current?.release()
    }
  }, [])

  const sendAction = useCallback(
    async (action: 'pause' | 'resume' | 'reset') => {
      if (!gameDate?.id || actionLoading) return
      setActionLoading(action)
      try {
        const path = action === 'reset' ? 'reset' : action
        await fetch(`/api/timer/game-date/${gameDate.id}/${path}`, {
          method: 'POST',
          credentials: 'include',
        })
        timer.refresh()
      } finally {
        setActionLoading(null)
      }
    },
    [gameDate?.id, actionLoading, timer]
  )

  const isActive = timer.status === 'active'
  const isPaused = timer.status === 'paused'
  const isInactive = timer.status === 'inactive' || timer.status === 'completed'
  const isUnlimited = timer.currentBlind?.duration === 0
  const isBreak = timer.currentBlind?.smallBlind === 0 && timer.currentBlind?.bigBlind === 0
  const progressPct =
    timer.totalLevelDuration > 0
      ? Math.min(100, (timer.elapsedInLevel / timer.totalLevelDuration) * 100)
      : 0

  // Timer color
  const timeColor = isPaused
    ? 'var(--cp-warning)'
    : timer.isCritical
    ? 'var(--cp-primary)'
    : '#ffffff'

  if (!gameDate || isInactive) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--cp-background)' }}
      >
        <p style={{ color: 'var(--cp-on-surface-variant)', fontSize: '18px' }}>
          No hay fecha activa
        </p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-8 px-4 select-none"
      style={{ background: 'var(--cp-background)' }}
    >
      {/* Header */}
      <div className="text-center w-full">
        <p style={{ fontSize: '13px', color: 'var(--cp-on-surface-variant)', letterSpacing: '0.08em' }}>
          Fecha {gameDate.dateNumber}
        </p>
        <p style={{ fontSize: '15px', color: 'var(--cp-on-surface-medium)', marginTop: '4px' }}>
          {isBreak ? 'Descanso' : `Nivel ${timer.currentLevel}`}
          {!isBreak && timer.nextBlind ? ` de ${timer.nextBlind.level}` : ''}
        </p>
      </div>

      {/* Center block */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* PAUSED badge */}
        {isPaused && (
          <div
            className="px-4 py-1 rounded-full"
            style={{
              background: 'rgba(202, 138, 4, 0.15)',
              border: '1px solid var(--cp-warning)',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--cp-warning)', letterSpacing: '0.2em' }}>
              ⏸ PAUSADO
            </span>
          </div>
        )}

        {/* Countdown */}
        <div
          className={timer.isCritical && isActive ? 'animate-pulse' : ''}
          style={{
            fontSize: 'clamp(80px, 22vw, 150px)',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: timeColor,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            transition: 'color 0.3s',
          }}
        >
          {isUnlimited ? 'SIN LÍMITE' : timer.formattedTime}
        </div>

        {/* Current blinds / break label */}
        {timer.currentBlind && (
          isBreak ? (
            <div
              style={{
                fontSize: 'clamp(32px, 9vw, 56px)',
                fontWeight: 700,
                color: '#ca8a04',
                letterSpacing: '0.12em',
              }}
            >
              DESCANSO
            </div>
          ) : (
            <div
              style={{
                fontSize: 'clamp(28px, 8vw, 48px)',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.04em',
              }}
            >
              {timer.currentBlind.smallBlind.toLocaleString()} /{' '}
              {timer.currentBlind.bigBlind.toLocaleString()}
            </div>
          )
        )}

        {/* Next blinds */}
        {timer.nextBlind && !isBreak && (
          <p style={{ fontSize: '16px', color: 'var(--cp-on-surface-variant)' }}>
            {timer.nextBlind.smallBlind === 0
              ? 'Siguiente: Descanso'
              : `Siguiente: ${timer.nextBlind.smallBlind.toLocaleString()} / ${timer.nextBlind.bigBlind.toLocaleString()}`}
          </p>
        )}
        {timer.nextBlind && isBreak && (
          <p style={{ fontSize: '16px', color: 'var(--cp-on-surface-variant)' }}>
            Siguiente: {timer.nextBlind.smallBlind.toLocaleString()} /{' '}
            {timer.nextBlind.bigBlind.toLocaleString()}
          </p>
        )}
        {!timer.nextBlind && !isUnlimited && (
          <p style={{ fontSize: '14px', color: 'var(--cp-on-surface-variant)' }}>
            Último nivel
          </p>
        )}
      </div>

      {/* Bottom: progress + controls */}
      <div className="w-full space-y-6">
        {/* Progress bar */}
        {!isUnlimited && timer.totalLevelDuration > 0 && (
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: '4px', background: 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressPct}%`,
                background: timer.isCritical ? 'var(--cp-primary)' : 'rgba(255,255,255,0.4)',
              }}
            />
          </div>
        )}

        {/* Controls — Comision only */}
        {user?.role === 'Comision' && (
          <div className="flex gap-3 justify-center">
            {/* Pause */}
            {isActive && (
              <ControlBtn
                label="Pausa"
                onClick={() => sendAction('pause')}
                loading={actionLoading === 'pause'}
                color="#ca8a04"
              />
            )}
            {/* Continue */}
            {isPaused && (
              <ControlBtn
                label="Continuar"
                onClick={() => sendAction('resume')}
                loading={actionLoading === 'resume'}
                color="var(--cp-positive)"
              />
            )}
            {/* Reset */}
            <ControlBtn
              label="Reiniciar Blind"
              onClick={() => sendAction('reset')}
              loading={actionLoading === 'reset'}
              color="rgba(255,255,255,0.5)"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ControlBtn({
  label,
  onClick,
  loading,
  color,
}: {
  label: string
  onClick: () => void
  loading: boolean
  color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-2xl transition-all active:scale-95"
      style={{
        minWidth: '120px',
        height: '52px',
        padding: '0 20px',
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${color}`,
        color,
        fontSize: '15px',
        fontWeight: 600,
        opacity: loading ? 0.5 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? (
        <div
          className="w-4 h-4 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: color }}
        />
      ) : (
        label
      )}
    </button>
  )
}
