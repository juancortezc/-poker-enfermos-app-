'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { usePokerTimer } from '@/hooks/usePokerTimer'

type BreakPhase = 'none' | 'decision' | 'active'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimerPage() {
  const { user } = useAuth()
  const { gameDate } = useActiveGameDate({ refreshInterval: 30000 })
  const timer = usePokerTimer(gameDate?.id ?? null)
  const [actionLoading, setActionLoading] = useState<'pause' | 'resume' | 'reset' | 'levelup' | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Break / decision state
  const [breakPhase, setBreakPhase] = useState<BreakPhase>('none')
  const [breakElapsed, setBreakElapsed] = useState(0)
  const breakStartRef = useRef<number>(0)

  // Refs to prevent duplicate triggers
  const warned1MinLevelRef = useRef<number | null>(null)
  const decisionFiredLevelRef = useRef<number | null>(null)
  const isPausingRef = useRef(false)

  // Warning at 1 min
  const [showWarning, setShowWarning] = useState(false)

  const isComision = user?.role === 'Comision'

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

  // Break elapsed counter
  useEffect(() => {
    if (breakPhase !== 'active') return
    breakStartRef.current = performance.now()
    setBreakElapsed(0)
    const id = setInterval(() => {
      setBreakElapsed(Math.floor((performance.now() - breakStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [breakPhase])

  // 1-minute warning (visible to all)
  useEffect(() => {
    if (timer.status !== 'active') return
    if (timer.currentBlind?.duration === 0) return
    if (timer.displayTimeRemaining !== 60) return
    if (warned1MinLevelRef.current === timer.currentLevel) return
    warned1MinLevelRef.current = timer.currentLevel
    setShowWarning(true)
    const t = setTimeout(() => setShowWarning(false), 12000)
    return () => clearTimeout(t)
  }, [timer.displayTimeRemaining, timer.currentLevel, timer.status, timer.currentBlind, isComision])

  // Decision trigger when level ends (Comision only)
  useEffect(() => {
    if (!isComision) return
    if (timer.status !== 'active') return
    if (timer.displayTimeRemaining > 0) return
    if (!timer.nextBlind) return
    if (breakPhase !== 'none') return
    if (decisionFiredLevelRef.current === timer.currentLevel) return
    if (isPausingRef.current) return
    if (!gameDate?.id) return

    decisionFiredLevelRef.current = timer.currentLevel
    isPausingRef.current = true
    setShowWarning(false)

    fetch(`/api/timer/game-date/${gameDate.id}/pause`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(() => {
        timer.refresh()
        setBreakPhase('decision')
      })
      .finally(() => {
        isPausingRef.current = false
      })
  }, [timer.displayTimeRemaining, timer.currentLevel, timer.status, timer.nextBlind, breakPhase, gameDate?.id, isComision, timer])

  // When level actually changes (server confirmed), reset decision ref
  useEffect(() => {
    if (decisionFiredLevelRef.current === null) return
    if (decisionFiredLevelRef.current === timer.currentLevel) return
    decisionFiredLevelRef.current = null
    if (breakPhase !== 'none') setBreakPhase('none')
  }, [timer.currentLevel, breakPhase])

  const sendAction = useCallback(
    async (action: 'pause' | 'resume' | 'reset') => {
      if (!gameDate?.id || actionLoading) return
      setActionLoading(action)
      try {
        await fetch(`/api/timer/game-date/${gameDate.id}/${action === 'reset' ? 'reset' : action}`, {
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

  const sendLevelUp = useCallback(async () => {
    if (!gameDate?.id || !timer.nextBlind) return
    setActionLoading('levelup')
    try {
      await fetch(`/api/timer/game-date/${gameDate.id}/level-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toLevel: timer.nextBlind.level,
          fromLevel: timer.currentLevel,
        }),
      })
      setBreakPhase('none')
      timer.refresh()
    } finally {
      setActionLoading(null)
    }
  }, [gameDate?.id, timer])

  const handleBreakChoice = useCallback(
    async (choice: 'break' | 'continue') => {
      if (choice === 'break') {
        setBreakPhase('active')
      } else {
        await sendLevelUp()
      }
    },
    [sendLevelUp]
  )

  const isActive = timer.status === 'active'
  const isPaused = timer.status === 'paused'
  const isInactive = timer.status === 'inactive' || timer.status === 'completed'
  const isUnlimited = timer.currentBlind?.duration === 0

  const progressPct =
    timer.totalLevelDuration > 0
      ? Math.min(100, (timer.elapsedInLevel / timer.totalLevelDuration) * 100)
      : 0

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

  // ── BREAK ACTIVE ───────────────────────────────────────────────────────────
  if (breakPhase === 'active') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 select-none"
        style={{ background: 'var(--cp-background)' }}
      >
        <p style={{ fontSize: '13px', color: 'var(--cp-on-surface-variant)', letterSpacing: '0.08em' }}>
          Fecha {gameDate.dateNumber}
          {timer.nextBlind
            ? ` — Siguiente: ${timer.nextBlind.smallBlind.toLocaleString()}/${timer.nextBlind.bigBlind.toLocaleString()}`
            : ''}
        </p>

        <div
          style={{
            fontSize: 'clamp(36px, 10vw, 60px)',
            fontWeight: 700,
            color: '#ca8a04',
            letterSpacing: '0.14em',
          }}
        >
          DESCANSO
        </div>

        <div
          style={{
            fontSize: 'clamp(64px, 18vw, 120px)',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {formatElapsed(breakElapsed)}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--cp-on-surface-muted)', letterSpacing: '0.06em' }}>
          TIEMPO TRANSCURRIDO
        </p>

        {isComision && (
          <ControlBtn
            label="✓ Terminar Descanso"
            onClick={sendLevelUp}
            loading={actionLoading === 'levelup'}
            color="var(--cp-positive, #22c55e)"
          />
        )}
      </div>
    )
  }

  // ── DECISION (level just ended) ─────────────────────────────────────────────
  if (breakPhase === 'decision' && isComision) {
    const nextLabel = timer.nextBlind
      ? `${timer.nextBlind.smallBlind.toLocaleString()} / ${timer.nextBlind.bigBlind.toLocaleString()}`
      : '—'

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 select-none"
        style={{ background: 'var(--cp-background)' }}
      >
        <p style={{ fontSize: '13px', color: 'var(--cp-on-surface-variant)', letterSpacing: '0.08em' }}>
          Fecha {gameDate.dateNumber}
        </p>

        <div style={{ fontSize: 'clamp(26px, 7vw, 40px)', fontWeight: 700, color: '#ffffff', textAlign: 'center' }}>
          Nivel {timer.currentLevel} terminado
        </div>

        <p style={{ fontSize: '15px', color: 'var(--cp-on-surface-muted)', textAlign: 'center' }}>
          ¿Qué hacemos ahora?
        </p>

        <div className="flex flex-col gap-4 w-full" style={{ maxWidth: '320px' }}>
          <ControlBtn
            label="☕  Iniciar Descanso"
            onClick={() => handleBreakChoice('break')}
            loading={false}
            color="#ca8a04"
          />
          <ControlBtn
            label={`▶  Continuar — ${nextLabel}`}
            onClick={() => handleBreakChoice('continue')}
            loading={actionLoading === 'levelup'}
            color="var(--cp-positive, #22c55e)"
          />
        </div>
      </div>
    )
  }

  // ── NORMAL TIMER ────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-8 px-4 select-none"
      style={{ background: 'var(--cp-background)' }}
    >
      {/* 1-min warning banner */}
      {showWarning && (
        <div
          className="fixed top-4 left-4 right-4 rounded-2xl px-4 py-3 z-50 text-center"
          style={{ background: 'rgba(202,138,4,0.18)', border: '1px solid #ca8a04' }}
        >
          <span style={{ fontSize: '14px', color: '#ca8a04', fontWeight: 600 }}>
            ⚠️  1 minuto — Se acerca el descanso
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center w-full">
        <p style={{ fontSize: '13px', color: 'var(--cp-on-surface-variant)', letterSpacing: '0.08em' }}>
          Fecha {gameDate.dateNumber}
        </p>
        <p style={{ fontSize: '15px', color: 'var(--cp-on-surface-medium)', marginTop: '4px' }}>
          Nivel {timer.currentLevel}
          {timer.nextBlind ? ` de ${timer.nextBlind.level}` : ''}
        </p>
      </div>

      {/* Center block */}
      <div className="flex flex-col items-center gap-4 w-full">
        {isPaused && (
          <div
            className="px-4 py-1 rounded-full"
            style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid var(--cp-warning)' }}
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

        {/* Current blinds */}
        {timer.currentBlind && (
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
        )}

        {/* Next blinds */}
        {timer.nextBlind && (
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

        {isComision && (
          <div className="flex gap-3 justify-center flex-wrap">
            {isActive && (
              <ControlBtn
                label="Pausa"
                onClick={() => sendAction('pause')}
                loading={actionLoading === 'pause'}
                color="#ca8a04"
              />
            )}
            {isPaused && (
              <ControlBtn
                label="Continuar"
                onClick={() => sendAction('resume')}
                loading={actionLoading === 'resume'}
                color="var(--cp-positive, #22c55e)"
              />
            )}
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
        minWidth: '160px',
        height: '56px',
        padding: '0 24px',
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${color}`,
        color,
        fontSize: '15px',
        fontWeight: 600,
        opacity: loading ? 0.5 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        width: '100%',
        maxWidth: '320px',
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
