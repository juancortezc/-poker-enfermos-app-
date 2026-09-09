'use client'

import useSWR from 'swr'
import { ArrowDown, ArrowUp, Skull } from 'lucide-react'
import type { LiveRankingData, LiveRankingRow } from '@/lib/live-ranking'

/** "Juan Fernando Ochoa" → "Juan Fernando O." */
function shortName(full: string) {
  const parts = full.split(' ').filter(Boolean)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      className="flex-1 px-2 py-2 text-center"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
        borderRadius: 'var(--cp-radius-lg)',
      }}
    >
      <p
        className="uppercase"
        style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--cp-on-surface-variant)' }}
      >
        {label}
      </p>
      <p className="leading-none mt-1" style={{ fontSize: 22, fontWeight: 800, color: 'var(--cp-on-surface)' }}>
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 leading-none" style={{ fontSize: 10, color: 'var(--cp-on-surface-variant)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function TrendMark({ change }: { change: number }) {
  if (change === 0) {
    return <span style={{ fontSize: 10, color: 'var(--cp-on-surface-variant)' }}>—</span>
  }
  const up = change > 0
  const Icon = up ? ArrowUp : ArrowDown
  const color = up ? 'var(--cp-positive)' : 'var(--cp-primary)'
  return (
    <span className="inline-flex items-center gap-0.5" style={{ color }}>
      <Icon className="w-2.5 h-2.5" strokeWidth={3} />
      <span style={{ fontSize: 10, fontWeight: 700 }}>{Math.abs(change)}</span>
    </span>
  )
}

function Row({ row, isMe }: { row: LiveRankingRow; isMe: boolean }) {
  // Los que siguen en mesa muestran puntos proyectados: mismo color de acento
  // que la leyenda, sin negrita, para no confundirlos con los definitivos.
  const projected = row.state === 'playing'

  return (
    <div
      className="flex items-center gap-2 px-2"
      style={{
        height: 22,
        background: isMe ? 'rgba(229, 57, 53, 0.14)' : 'transparent',
        borderRadius: isMe ? 4 : 0,
      }}
    >
      <span
        className="text-right tabular-nums"
        style={{ width: 16, fontSize: 11, color: 'var(--cp-on-surface-variant)' }}
      >
        {row.position}
      </span>

      <span
        className="flex-1 truncate"
        style={{
          fontSize: 12,
          fontWeight: isMe ? 700 : 500,
          color: row.state === 'absent' ? 'var(--cp-on-surface-variant)' : 'var(--cp-on-surface)',
        }}
      >
        {shortName(row.playerName)}
      </span>

      {row.state === 'eliminated' && row.eliminationPosition && (
        <Skull className="w-2.5 h-2.5" style={{ color: 'var(--cp-on-surface-variant)' }} />
      )}

      <span
        className="text-right tabular-nums"
        style={{
          width: 30,
          fontSize: 12,
          fontWeight: projected ? 500 : 800,
          color: projected ? 'var(--cp-chip)' : 'var(--cp-on-surface)',
        }}
      >
        {row.score}
      </span>

      <span className="text-right" style={{ width: 24 }}>
        <TrendMark change={row.positionsChanged} />
      </span>
    </div>
  )
}

export function LiveDateBoard({ gameDateId, userId }: { gameDateId: number; userId: string }) {
  const { data, error, isLoading } = useSWR<LiveRankingData & { currentBlind: BlindInfo | null }>(
    `/api/game-dates/${gameDateId}/live-ranking`,
    { refreshInterval: 5000, revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  if (isLoading) {
    return (
      <div className="py-10 text-center" style={{ color: 'var(--cp-on-surface-variant)', fontSize: 13 }}>
        Cargando la mesa...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-10 text-center" style={{ color: 'var(--cp-on-surface-variant)', fontSize: 13 }}>
        No se pudo cargar el estado de la fecha.
      </div>
    )
  }

  const { gameDate, projection, lastElimination, rows, currentBlind } = data

  return (
    <div className="space-y-2">
      {/* KPIs */}
      <div className="flex gap-2">
        <Kpi label="Jugadores" value={String(gameDate.totalPlayers)} hint={`Fecha ${gameDate.dateNumber}`} />
        <Kpi label="En juego" value={String(gameDate.playersRemaining)} hint={`${gameDate.eliminationsCount} fuera`} />
        <Kpi
          label="Blind"
          value={currentBlind ? String(currentBlind.level) : '—'}
          hint={currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : 'sin timer'}
        />
      </div>

      {/* Último eliminado */}
      {lastElimination && (
        <div
          className="flex items-center gap-3 px-3 py-2"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: 'var(--cp-radius-lg)',
          }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="uppercase"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--cp-on-surface-variant)' }}
            >
              Último eliminado · {lastElimination.position}º
            </p>
            <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--cp-on-surface)' }}>
              {shortName(lastElimination.playerName)}
            </p>
            <p className="truncate" style={{ fontSize: 11, color: 'var(--cp-on-surface-medium)' }}>
              por {shortName(lastElimination.eliminatorName)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="leading-none" style={{ fontSize: 24, fontWeight: 800, color: 'var(--cp-on-surface)' }}>
              +{lastElimination.points}
            </p>
            <p style={{ fontSize: 10, color: 'var(--cp-on-surface-variant)' }}>puntos</p>
          </div>
        </div>
      )}

      {/* Tabla proyectada */}
      <div
        className="px-1 py-2"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: 'var(--cp-radius-lg)',
        }}
      >
        <div className="flex items-baseline justify-between px-2 pb-1.5">
          <p
            className="uppercase"
            style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--cp-on-surface-variant)' }}
          >
            Tabla proyectada
          </p>
          <p style={{ fontSize: 10, color: 'var(--cp-on-surface-variant)' }}>
            <span style={{ color: 'var(--cp-chip)' }}>■</span> si sale ahora: +{projection.nextPoints} pts
          </p>
        </div>

        {rows.map((row) => (
          <Row key={row.playerId} row={row} isMe={row.playerId === userId} />
        ))}

        <p className="px-2 pt-1.5" style={{ fontSize: 9, color: 'var(--cp-on-surface-variant)' }}>
          Puntaje del torneo con ELIMINA {projection.datesToEliminate}
          {projection.eliminasActive ? '' : ' (todavía informativo)'} · en negrita los puntos ya definidos
        </p>
      </div>
    </div>
  )
}

interface BlindInfo {
  level: number
  smallBlind: number
  bigBlind: number
  timeRemaining: number
  status: string
}
