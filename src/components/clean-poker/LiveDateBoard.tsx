'use client'

import useSWR from 'swr'
import type { LiveRankingData, LiveRankingRow } from '@/lib/live-ranking'

interface BlindInfo {
  level: number
  smallBlind: number
  bigBlind: number
  timeRemaining: number
  status: string
}

/** "Juan Fernando Ochoa" → "Juan Fernando O." */
function shortName(full: string) {
  const parts = full.split(' ').filter(Boolean)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
}

const MEDALS: Record<number, string> = { 1: '#F0B429', 2: '#C0C0C0', 3: '#CD7F32' }
const MUTED = 'rgba(255,255,255,0.45)'
const PANEL = '1px solid rgba(255,255,255,0.08)'

/**
 * Toda la pantalla tiene que entrar sin scroll con 19 jugadores en la tabla,
 * así que las alturas de arriba están recortadas al mínimo: sin iconos en los
 * KPIs y sin fotos en las filas.
 */
function Kpi({ label, value, hint, tint }: { label: string; value: string; hint: string; tint: string }) {
  return (
    <div
      className="flex-1 min-w-0 px-2.5 py-1.5"
      style={{ background: tint, border: PANEL, borderRadius: 10 }}
    >
      <p className="uppercase truncate" style={{ fontSize: 9, letterSpacing: '0.1em', color: MUTED }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="leading-none" style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
          {value}
        </span>
        <span className="truncate leading-none" style={{ fontSize: 10, color: MUTED }}>
          {hint}
        </span>
      </div>
    </div>
  )
}

function Var({ change }: { change: number }) {
  if (change === 0) {
    return <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>—</span>
  }
  const up = change > 0
  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{ color: up ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: 700 }}
    >
      <span style={{ fontSize: 8 }}>{up ? '▲' : '▼'}</span>
      {Math.abs(change)}
    </span>
  )
}

function Row({ row, isMe, striped }: { row: LiveRankingRow; isMe: boolean; striped: boolean }) {
  // Los puntos proyectados (sigue en mesa) van en ámbar y sin negrita; los ya
  // definidos en blanco y en negrita.
  const projected = row.state === 'playing'
  const medal = MEDALS[row.position]

  return (
    <div
      className="flex items-center gap-2 px-2"
      style={{
        height: 24,
        background: isMe ? 'rgba(229,57,53,0.18)' : striped ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderLeft: isMe ? '3px solid #E53935' : '3px solid transparent',
      }}
    >
      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 20 }}>
        {medal ? (
          <span
            className="flex items-center justify-center"
            style={{
              width: 17,
              height: 17,
              borderRadius: '50%',
              background: medal,
              color: '#1a1a1a',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {row.position}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: MUTED }}>{row.position}</span>
        )}
      </div>

      <span
        className="flex-1 truncate"
        style={{
          fontSize: 13,
          fontWeight: isMe ? 700 : 500,
          color: row.state === 'absent' ? 'rgba(255,255,255,0.4)' : '#fff',
        }}
      >
        {shortName(row.playerName)}
      </span>

      <span
        className="text-right tabular-nums flex-shrink-0"
        style={{
          width: 34,
          fontSize: 13,
          fontWeight: projected ? 500 : 800,
          color: projected ? '#F0B429' : '#fff',
        }}
      >
        {row.score}
      </span>

      <span className="text-right flex-shrink-0" style={{ width: 28 }}>
        <Var change={row.positionsChanged} />
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
      <div className="py-10 text-center" style={{ color: MUTED, fontSize: 13 }}>
        Cargando la mesa...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-10 text-center" style={{ color: MUTED, fontSize: 13 }}>
        No se pudo cargar el estado de la fecha.
      </div>
    )
  }

  const { gameDate, projection, lastElimination, rows, currentBlind } = data

  return (
    <div className="space-y-2">
      {/* KPIs */}
      <div className="flex gap-2">
        <Kpi
          label="Jugadores"
          value={String(gameDate.totalPlayers)}
          hint={`Fecha ${gameDate.dateNumber}`}
          tint="rgba(229,57,53,0.14)"
        />
        <Kpi
          label="En juego"
          value={String(gameDate.playersRemaining)}
          hint={`${gameDate.eliminationsCount} fuera`}
          tint="rgba(34,197,94,0.14)"
        />
        <Kpi
          label="Blind"
          value={currentBlind ? String(currentBlind.level) : '—'}
          hint={currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : 'sin timer'}
          tint="rgba(168,85,247,0.14)"
        />
      </div>

      {/* Último eliminado */}
      {lastElimination && (
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            background: 'rgba(229,57,53,0.12)',
            border: PANEL,
            borderRadius: 10,
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="uppercase" style={{ fontSize: 9, letterSpacing: '0.1em', color: MUTED }}>
              Último eliminado · {lastElimination.position}º
            </p>
            <p className="truncate" style={{ fontSize: 13, color: '#fff' }}>
              <span style={{ fontWeight: 700 }}>{shortName(lastElimination.playerName)}</span>
              <span style={{ color: MUTED }}> por {shortName(lastElimination.eliminatorName)}</span>
            </p>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: 20, fontWeight: 800, color: '#F0B429' }}>
            +{lastElimination.points}
          </span>
        </div>
      )}

      {/* Tabla del torneo */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: PANEL, borderRadius: 10, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <h2 className="truncate" style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
            TABLA DEL TORNEO
          </h2>
          <p className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ color: '#F0B429', fontSize: 8 }}>●</span>
            Si sale ahora: +{projection.nextPoints}
          </p>
        </div>

        {/* Encabezado de columnas */}
        <div
          className="flex items-center gap-2 px-2 py-1"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '3px solid transparent',
          }}
        >
          <span
            className="uppercase flex-shrink-0 text-center"
            style={{ width: 20, fontSize: 9, letterSpacing: '0.08em', color: MUTED }}
          >
            #
          </span>
          <span className="uppercase flex-1" style={{ fontSize: 9, letterSpacing: '0.08em', color: MUTED }}>
            Jugador
          </span>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 34, fontSize: 9, letterSpacing: '0.08em', color: MUTED }}
          >
            Pts
          </span>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 28, fontSize: 9, letterSpacing: '0.08em', color: MUTED }}
          >
            Var
          </span>
        </div>

        {rows.map((row, index) => (
          <Row key={row.playerId} row={row} isMe={row.playerId === userId} striped={index % 2 === 1} />
        ))}

        <p
          className="px-3 py-1.5"
          style={{ fontSize: 9, color: MUTED, borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          Puntaje final con ELIMINA {projection.datesToEliminate}
          {projection.eliminasActive ? '' : ' (informativo)'} · en{' '}
          <span style={{ color: '#F0B429' }}>ámbar</span> lo proyectado si sale ahora
        </p>
      </div>
    </div>
  )
}
