'use client'

import { Users, Skull, Timer, ClipboardList, List } from 'lucide-react'
import Link from 'next/link'

interface LastElimination {
  eliminatedPlayer: string
  eliminatedPosition: number
  eliminatorPlayer: string
  pointsAwarded: number
}

interface LiveGameCardProps {
  dateNumber: number
  playersRemaining: number
  playersTotal: number
  lastElimination?: LastElimination | null
  timerHref?: string
  registerHref?: string
  eliminationsHref?: string
  isCommission?: boolean
}

export function LiveGameCard({
  dateNumber,
  playersRemaining,
  playersTotal,
  lastElimination,
  timerHref = '/timer',
  registerHref = '/registro',
  eliminationsHref = '/fecha-actual',
  isCommission = false
}: LiveGameCardProps) {
  const eliminationsCount = playersTotal - playersRemaining

  return (
    <div
      className="cp-card p-4 relative overflow-hidden"
      style={{
        borderLeft: '3px solid var(--cp-live)',
      }}
    >
      {/* Live glow effect */}
      <div
        className="absolute top-0 left-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-30"
        style={{ background: 'var(--cp-live)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: 'var(--cp-live)',
              boxShadow: '0 0 8px var(--cp-live-glow)'
            }}
          />
          <span
            className="font-semibold uppercase"
            style={{
              fontSize: 'var(--cp-label-size)',
              color: 'var(--cp-live)'
            }}
          >
            En Vivo
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-on-surface-variant)'
          }}
        >
          Fecha #{dateNumber}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Jugadores */}
        <div
          className="text-center p-2 rounded-lg"
          style={{
            background: 'var(--cp-surface-solid)',
            border: '1px solid var(--cp-surface-border)'
          }}
        >
          <p
            className="font-bold"
            style={{
              fontSize: 'var(--cp-title-size)',
              color: 'var(--cp-on-surface)'
            }}
          >
            {playersTotal}
          </p>
          <p
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-muted)'
            }}
          >
            Jugadores
          </p>
        </div>

        {/* Activos */}
        <div
          className="text-center p-2 rounded-lg"
          style={{
            background: 'var(--cp-surface-solid)',
            border: '1px solid var(--cp-surface-border)'
          }}
        >
          <p
            className="font-bold"
            style={{
              fontSize: 'var(--cp-title-size)',
              color: 'var(--cp-live)'
            }}
          >
            {playersRemaining}
          </p>
          <p
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-muted)'
            }}
          >
            Activos
          </p>
        </div>

        {/* Eliminados */}
        <div
          className="text-center p-2 rounded-lg"
          style={{
            background: 'var(--cp-surface-solid)',
            border: '1px solid var(--cp-surface-border)'
          }}
        >
          <p
            className="font-bold"
            style={{
              fontSize: 'var(--cp-title-size)',
              color: 'var(--cp-on-surface-variant)'
            }}
          >
            {eliminationsCount}
          </p>
          <p
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-muted)'
            }}
          >
            Eliminados
          </p>
        </div>
      </div>

      {/* Last Elimination */}
      {lastElimination ? (
        <div
          className="rounded-lg p-3 mb-3"
          style={{
            background: 'var(--cp-surface-solid)',
            border: '1px solid var(--cp-surface-border)'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Skull className="w-4 h-4" style={{ color: 'var(--cp-on-surface-muted)' }} />
            <span
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-muted)'
              }}
            >
              Última eliminación
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p
                className="font-semibold"
                style={{
                  fontSize: 'var(--cp-body-size)',
                  color: 'var(--cp-on-surface)'
                }}
              >
                {lastElimination.eliminatedPlayer}
              </p>
              <p
                style={{
                  fontSize: 'var(--cp-caption-size)',
                  color: 'var(--cp-on-surface-variant)'
                }}
              >
                vs {lastElimination.eliminatorPlayer}
              </p>
            </div>
            <div className="text-right">
              <span
                className="font-bold"
                style={{
                  fontSize: 'var(--cp-body-size)',
                  color: 'var(--cp-positive)'
                }}
              >
                +{lastElimination.pointsAwarded} pts
              </span>
              <p
                style={{
                  fontSize: 'var(--cp-caption-size)',
                  color: 'var(--cp-on-surface-muted)'
                }}
              >
                Pos #{lastElimination.eliminatedPosition}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg p-3 mb-3 text-center"
          style={{
            background: 'var(--cp-surface-solid)',
            border: '1px solid var(--cp-surface-border)'
          }}
        >
          <Users className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <p
            className="italic"
            style={{
              fontSize: 'var(--cp-body-size)',
              color: 'var(--cp-on-surface-muted)'
            }}
          >
            Sin eliminaciones aún
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Link
          href={timerHref}
          className="flex-1 flex items-center justify-center gap-2 py-2 font-medium transition-all hover:opacity-90"
          style={{
            border: '1px solid var(--cp-surface-border)',
            color: 'var(--cp-on-surface)',
            fontSize: 'var(--cp-label-size)',
            borderRadius: '4px'
          }}
        >
          <Timer className="w-4 h-4" />
          Timer
        </Link>

        <Link
          href={eliminationsHref}
          className="flex-1 flex items-center justify-center gap-2 py-2 font-medium transition-all hover:opacity-90"
          style={{
            border: '1px solid var(--cp-surface-border)',
            color: 'var(--cp-on-surface)',
            fontSize: 'var(--cp-label-size)',
            borderRadius: '4px'
          }}
        >
          <List className="w-4 h-4" />
          Ver Fecha
        </Link>

        {isCommission && (
          <Link
            href={registerHref}
            className="flex-1 flex items-center justify-center gap-2 py-2 font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--cp-primary)',
              color: 'var(--cp-on-primary)',
              fontSize: 'var(--cp-label-size)',
              borderRadius: '4px'
            }}
          >
            <ClipboardList className="w-4 h-4" />
            Registro
          </Link>
        )}
      </div>
    </div>
  )
}

export default LiveGameCard
