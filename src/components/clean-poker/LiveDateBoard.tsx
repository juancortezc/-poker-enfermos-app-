'use client'

import useSWR from 'swr'
import { SCORE_LABELS } from '@/lib/ranking-utils'
import { TIMER_ENABLED } from '@/lib/feature-flags'
import { shortenFullName } from '@/lib/player-name'
import type { LiveRankingData, LiveRankingRow } from '@/lib/live-ranking'

interface BlindInfo {
  level: number
  smallBlind: number
  bigBlind: number
  timeRemaining: number
  status: string
}

const MEDALS: Record<number, string> = { 1: '#F0B429', 2: '#C0C0C0', 3: '#C08A54' }
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
      <p className="uppercase truncate" style={{ fontSize: 12, letterSpacing: '0.1em', color: MUTED }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="leading-none" style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
          {value}
        </span>
        <span className="truncate leading-none" style={{ fontSize: 12, color: MUTED }}>
          {hint}
        </span>
      </div>
    </div>
  )
}

function Var({ change }: { change: number }) {
  if (change === 0) {
    return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>—</span>
  }
  const up = change > 0
  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{ color: up ? '#6ECB71' : '#E53935', fontSize: 13, fontWeight: 700 }}
    >
      <span style={{ fontSize: 12 }}>{up ? '▲' : '▼'}</span>
      {Math.abs(change)}
    </span>
  )
}

/**
 * Responde las tres preguntas que el jugador se hace en la mesa: cuánto tenía,
 * cuánto gana si sale ahora y con cuánto termina, más la posición resultante.
 *
 * El punto fino: el ELIMINA descarta un número FIJO de peores fechas. Al
 * entrar la fecha de hoy al conjunto cambia cuál fecha se descarta, así que lo
 * que hoy le suma al puntaje final casi nunca es igual al premio de la fecha.
 * Puede ser 0 (hoy es de las peores y se descarta) o incluso mayor que el
 * premio (hoy destapa una fecha peor que ya no se descarta). Ese desfase era
 * lo que no se entendía: el puntaje quieto y la posición moviéndose. Por eso
 * se nombra en vez de dejarlo implícito.
 */
function MyStatus({ row, nextPosition }: { row: LiveRankingRow; nextPosition: number }) {
  const playing = row.state === 'playing'
  // Lo que la fecha de hoy le suma de verdad al puntaje final.
  const realGain = row.score - row.baseScore

  let note: string | null = null
  if (row.todayAbsorbed) {
    note = `Hoy entra entre tus peores fechas, asi que el ELIMINA la descarta: aguantar mas no te mueve el ${SCORE_LABELS.points} y la posicion cambia por lo que hagan los demas.`
  } else if (playing && realGain !== row.todayPoints) {
    note = `El total no es una suma directa: al entrar esta fecha el ELIMINA cambia cual de tus fechas viejas se descarta.`
  }

  return (
    <div
      className="px-2.5 py-1.5"
      style={{ background: 'rgba(229,57,53,0.16)', border: '1px solid rgba(229,57,53,0.35)', borderRadius: 10 }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="uppercase truncate" style={{ fontSize: 12, letterSpacing: '0.1em', color: MUTED }}>
          {playing ? `Tú · sales ${nextPosition}º` : `Tú · saliste ${row.eliminationPosition}º`}
        </p>
        <p className="flex items-center gap-1.5 flex-shrink-0">
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{row.position}º</span>
          <Var change={row.positionsChanged} />
        </p>
      </div>

      <div className="flex items-baseline gap-1.5 mt-0.5" style={{ fontSize: 13 }}>
        <span style={{ color: MUTED }}>Traías</span>
        <span style={{ fontWeight: 800, color: '#fff' }}>{row.baseScore}</span>
        <span style={{ color: MUTED }}>·</span>
        <span style={{ color: MUTED }}>{playing ? 'ganas' : 'ganaste'}</span>
        <span style={{ fontWeight: 800, color: playing ? '#F0B429' : '#fff' }}>+{row.todayPoints}</span>
        <span style={{ color: MUTED }}>·</span>
        <span style={{ color: MUTED }}>{playing ? 'terminas' : 'terminaste'}</span>
        <span style={{ fontWeight: 800, color: playing ? '#F0B429' : '#fff' }}>{row.score}</span>
      </div>

      {note && (
        <p className="mt-0.5" style={{ fontSize: 12, color: MUTED, lineHeight: 1.3 }}>
          {note}
        </p>
      )}
    </div>
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
              color: '#2B2120',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {row.position}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: MUTED }}>{row.position}</span>
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
        {shortenFullName(row.playerName)}
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
  const me = rows.find((r) => r.playerId === userId)
  const showMyStatus = me && me.state !== 'absent'

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
        {/* Con el timer apagado este KPI solo mostraria un guion. */}
        {TIMER_ENABLED && (
          <Kpi
            label="Blind"
            value={currentBlind ? String(currentBlind.level) : '—'}
            hint={currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : 'sin timer'}
            tint="rgba(168,85,247,0.14)"
          />
        )}
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
            <p className="uppercase" style={{ fontSize: 12, letterSpacing: '0.1em', color: MUTED }}>
              Último eliminado · {lastElimination.position}º
            </p>
            <p className="truncate" style={{ fontSize: 13, color: '#fff' }}>
              <span style={{ fontWeight: 700 }}>{shortenFullName(lastElimination.playerName)}</span>
              <span style={{ color: MUTED }}> por {shortenFullName(lastElimination.eliminatorName)}</span>
            </p>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: 20, fontWeight: 800, color: '#F0B429' }}>
            +{lastElimination.points}
          </span>
        </div>
      )}

      {showMyStatus && <MyStatus row={me} nextPosition={projection.nextPosition} />}

      {/* Tabla del torneo */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: PANEL, borderRadius: 10, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <h2 className="truncate" style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
            TABLA DEL TORNEO
          </h2>
          <p className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ color: '#F0B429', fontSize: 12 }}>●</span>
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
            style={{ width: 20, fontSize: 12, letterSpacing: '0.08em', color: MUTED }}
          >
            #
          </span>
          <span className="uppercase flex-1" style={{ fontSize: 12, letterSpacing: '0.08em', color: MUTED }}>
            Jugador
          </span>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 34, fontSize: 12, letterSpacing: '0.08em', color: MUTED }}
          >
            {SCORE_LABELS.pointsShort}
          </span>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 28, fontSize: 12, letterSpacing: '0.08em', color: MUTED }}
          >
            Var
          </span>
        </div>

        {rows.map((row, index) => (
          <Row key={row.playerId} row={row} isMe={row.playerId === userId} striped={index % 2 === 1} />
        ))}

        <p
          className="px-3 py-1.5"
          style={{ fontSize: 12, color: MUTED, borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {SCORE_LABELS.points} descarta tus {projection.datesToEliminate} peores fechas
          {projection.eliminasActive ? '' : ' (todavía informativo)'} · en{' '}
          <span style={{ color: '#F0B429' }}>ámbar</span> lo proyectado si sale ahora
        </p>
      </div>
    </div>
  )
}
