'use client'

import useSWR from 'swr'
import { BarChart3, Coins, Info, Spade, Users } from 'lucide-react'
import { HomeAvatar } from './HomeAvatar'
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

function Kpi({
  icon,
  label,
  value,
  hint,
  tint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  tint: string
}) {
  return (
    <div
      className="flex-1 min-w-0 px-3 py-3"
      style={{
        background: `linear-gradient(160deg, ${tint}, rgba(255,255,255,0.02))`,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
      }}
    >
      <div
        className="flex items-center justify-center mb-2"
        style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }}
      >
        {icon}
      </div>
      <p
        className="uppercase truncate"
        style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)' }}
      >
        {label}
      </p>
      <p className="leading-none mt-1" style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>
        {value}
      </p>
      <p className="mt-1 leading-none truncate" style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
        {hint}
      </p>
    </div>
  )
}

function Var({ change }: { change: number }) {
  if (change === 0) {
    return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>—</span>
  }
  const up = change > 0
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ color: up ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 700 }}
    >
      <span style={{ fontSize: 9 }}>{up ? '▲' : '▼'}</span>
      {Math.abs(change)}
    </span>
  )
}

function Row({ row, isMe, striped }: { row: LiveRankingRow; isMe: boolean; striped: boolean }) {
  // Los puntos proyectados (sigue en mesa) van en ámbar y sin negrita; los ya
  // definidos en blanco y en negrita. Es la única forma de distinguirlos.
  const projected = row.state === 'playing'
  const medal = MEDALS[row.position]

  return (
    <div
      className="flex items-center gap-2 px-3"
      style={{
        height: 40,
        background: isMe ? 'rgba(229,57,53,0.16)' : striped ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderLeft: isMe ? '3px solid #E53935' : '3px solid transparent',
      }}
    >
      {/* Posición: medalla para el podio */}
      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 26 }}>
        {medal ? (
          <span
            className="flex items-center justify-center"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: medal,
              color: '#1a1a1a',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {row.position}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{row.position}</span>
        )}
      </div>

      <div className="rounded-full overflow-hidden flex-shrink-0">
        <HomeAvatar playerId={row.playerId} name={row.playerName} photoUrl={row.playerPhoto} size={28} />
      </div>

      <span
        className="flex-1 truncate"
        style={{
          fontSize: 14,
          fontWeight: isMe ? 700 : 500,
          color: row.state === 'absent' ? 'rgba(255,255,255,0.45)' : '#fff',
        }}
      >
        {shortName(row.playerName)}
      </span>

      <span
        className="text-right tabular-nums flex-shrink-0"
        style={{
          width: 40,
          fontSize: 15,
          fontWeight: projected ? 500 : 800,
          color: projected ? '#F0B429' : '#fff',
        }}
      >
        {row.score}
      </span>

      <span className="text-right flex-shrink-0" style={{ width: 34 }}>
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
      <div className="py-10 text-center" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        Cargando la mesa...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-10 text-center" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        No se pudo cargar el estado de la fecha.
      </div>
    )
  }

  const { gameDate, projection, lastElimination, rows, currentBlind } = data

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="flex gap-2.5">
        <Kpi
          icon={<Users className="w-4 h-4" style={{ color: '#f87171' }} />}
          label="Jugadores"
          value={String(gameDate.totalPlayers)}
          hint={`Fecha ${gameDate.dateNumber}`}
          tint="rgba(229,57,53,0.14)"
        />
        <Kpi
          icon={<Spade className="w-4 h-4" style={{ color: '#4ade80' }} />}
          label="En juego"
          value={String(gameDate.playersRemaining)}
          hint={`${gameDate.eliminationsCount} fuera`}
          tint="rgba(34,197,94,0.14)"
        />
        <Kpi
          icon={<Coins className="w-4 h-4" style={{ color: '#c084fc' }} />}
          label="Blind"
          value={currentBlind ? String(currentBlind.level) : '—'}
          hint={currentBlind ? `${currentBlind.smallBlind} / ${currentBlind.bigBlind}` : 'sin timer'}
          tint="rgba(168,85,247,0.14)"
        />
      </div>

      {/* Último eliminado */}
      {lastElimination && (
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: 'linear-gradient(160deg, rgba(229,57,53,0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
          }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="uppercase"
              style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}
            >
              Último eliminado · {lastElimination.position}º
            </p>
            <p className="truncate mt-0.5" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {shortName(lastElimination.playerName)}
            </p>
            <p className="truncate" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              por {shortName(lastElimination.eliminatorName)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="leading-none" style={{ fontSize: 26, fontWeight: 800, color: '#F0B429' }}>
              +{lastElimination.points}
            </p>
            <p className="mt-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
              puntos
            </p>
          </div>
        </div>
      )}

      {/* Tabla del torneo */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 flex-shrink-0" style={{ color: '#E53935' }} />
            <h2 className="truncate" style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>
              TABLA DEL TORNEO
            </h2>
          </div>
          <p className="flex items-center gap-1.5 flex-shrink-0" style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ color: '#F0B429', fontSize: 9 }}>●</span>
            Si sale ahora: +{projection.nextPoints} pts
          </p>
        </div>

        {/* Encabezado de columnas */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '3px solid transparent',
          }}
        >
          <span
            className="uppercase flex-shrink-0 text-center"
            style={{ width: 26, fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)' }}
          >
            #
          </span>
          <span className="flex-shrink-0" style={{ width: 28 }} />
          <span
            className="uppercase flex-1"
            style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)' }}
          >
            Jugador
          </span>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 40, fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)' }}
          >
            Pts
          </span>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 34, fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)' }}
          >
            Var
          </span>
        </div>

        {rows.map((row, index) => (
          <Row key={row.playerId} row={row} isMe={row.playerId === userId} striped={index % 2 === 1} />
        ))}

        <div
          className="flex items-start gap-2 px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
            Puntaje del torneo con ELIMINA {projection.datesToEliminate}
            {projection.eliminasActive ? '' : ' (todavía informativo)'} · en{' '}
            <span style={{ color: '#F0B429' }}>ámbar</span> los puntos proyectados si sale ahora
          </p>
        </div>
      </div>
    </div>
  )
}
