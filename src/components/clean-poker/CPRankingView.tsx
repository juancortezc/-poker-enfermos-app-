'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import {
  playedDateNumbers,
  nightlyPosition,
  averagePointsPerDate,
  eliminatedDateNumbers,
  scoreOf,
  compareByTiebreak,
  SCORE_LABELS
} from '@/lib/ranking-utils'
import type { PlayerRanking } from '@/lib/ranking-utils'
import { downloadCsv } from '@/lib/csv'
import { tile, SOBRE_COLOR } from './bento'
import { shortenFullName } from '@/lib/player-name'

interface CPRankingViewProps {
  tournamentId: number
  tournamentNumber: number
  currentUserId?: string | null
}

const GRID = '#000'
const RED = '#E53935'
const GOLD = '#E8C158'
const SILVER = '#C9C6C2'
const BRONZE = '#C08A54'
const HEADER_BG = '#382E2C'
/**
 * Paleta del club: negro, rojo y blanco para lo que suma; naranja para lo que
 * resta. PUNTOS es la única columna marcada en rojo — es la que manda. ACUM. y
 * las fechas descartadas comparten el naranja porque son la misma familia:
 * puntos que el jugador no se lleva.
 */
const POINTS_TINT = '#FFF5F4'
/** Rojo profundo: el mismo del club, con contraste suficiente para texto blanco. */
const RED_DEEP = '#C62828'
const ORANGE = '#C2410C'        // lo negativo sobre fondo claro
const ORANGE_ON_DARK = '#E8863C' // lo negativo sobre tarjeta oscura
const GREEN_ON_DARK = '#6ECB71'
// Papel: la tarjeta del lider es el momento de celebracion, y el blanco es el
// tercer color del club. Estas variantes son las unicas que pasan AA sobre el.
const PAPER_INK = '#1D1615'
const PAPER_INK_2 = '#574C49'
const PAPER_GOLD = '#7F5D07'
/** Ambar = proyectado, no jugado. Mismo codigo que el tablero en vivo. */
const PROJECTED = '#B07A08'
const PAPER_GREEN = '#136B34'
const PAPER_SILVER = '#6E6A67'   // plata COMO TEXTO sobre papel: 5.0:1
const PAPER_BRONZE = '#8B5E2F'   // bronce COMO TEXTO sobre papel: 5.3:1
const PAPER_ORANGE = '#A8360A'
const INACTIVE_TEXT = '#9A8F8B'
const MESA_FINAL_THRESHOLD = 9

/**
 * Una sola tabla con tres niveles de detalle. Todas ordenan por PUNTOS —
 * lo que cambia es cuánto se abre la información alrededor de ese número.
 */
type TableView = 'resumen' | 'fechas' | 'elimina' | 'acum'

const VIEWS: { id: TableView; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'fechas', label: 'Fechas' },
  { id: 'elimina', label: 'Elimina' },
  { id: 'acum', label: SCORE_LABELS.accumulated }
]

function medalBadgeStyle(position: number) {
  if (position === 1) return { background: GOLD, color: '#1A1512' }
  if (position === 2) return { background: SILVER, color: '#1A1512' }
  if (position === 3) return { background: BRONZE, color: '#1A1512' }
  return { background: '#382E2C', color: '#F5EFE6' }
}

function CircleAvatar({ photoUrl, name, size = 26 }: { photoUrl?: string; name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#333' }}>
      {photoUrl ? (
        <Image src={photoUrl} alt={name} width={size} height={size} className="object-cover w-full h-full" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ fontSize: size * 0.35, fontWeight: 800, color: '#fff' }}>
          {initials}
        </div>
      )}
    </div>
  )
}

export function CPRankingView({ tournamentId, tournamentNumber, currentUserId }: CPRankingViewProps) {
  const router = useRouter()
  const goToPlayer = (playerId: string) => router.push(`/players/${playerId}`)
  const [view, setView] = useState<TableView>('resumen')

  const { ranking: rankingData, isLoading, isError, errorMessage, refresh } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <div className="h-32 animate-pulse rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-64 animate-pulse rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 text-center rounded-2xl" style={{ background: 'var(--cp-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 14, color: '#F5EFE6' }}>Error al cargar la tabla</p>
        <p className="mt-1" style={{ fontSize: 13, color: '#9A8F8B' }}>{errorMessage}</p>
        <button onClick={() => refresh()} className="mt-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${RED}`, color: RED, fontSize: 12 }}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!rankingData || rankingData.rankings.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl" style={{ background: 'var(--cp-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 14, color: '#9A8F8B' }}>No hay datos de tabla disponibles.</p>
      </div>
    )
  }

  const { rankings, tournament } = rankingData
  const completedDates = playedDateNumbers(rankings)
  const datesToEliminate = tournament.datesToEliminate ?? 2
  const totalDates = tournament.totalDates ?? 12
  const bestOf = Math.max(0, totalDates - datesToEliminate)
  /** El umbral del ELIMINA es global: mismo número de fechas jugadas para todos. */
  const eliminasActive = rankings.some(r => r.eliminasActive)
  const showElimina3 = datesToEliminate >= 3
  const hasPenalties = rankings.some(r => (r.pointPenalty ?? 0) > 0)
  const hasLiveProjection = rankings.some(r => r.liveProjection)

  /**
   * Vista ACUM.: el mismo torneo ordenado por puntos reales, sin descartar
   * ninguna fecha. No reemplaza a la tabla oficial — es una lectura paralela,
   * util para ver a quien le pesa el ELIMINA y a quien lo salva.
   *
   * Se ordena y se numera aparte; `rankings` sigue viniendo ordenado por el
   * puntaje que manda y no se toca.
   */
  const acumDe = (p: PlayerRanking) => p.totalPoints + (p.liveProjection?.points ?? 0)

  const filas = (() => {
    if (view !== 'acum') {
      return rankings.map(player => ({ player, posicion: player.position }))
    }
    const ordenadas = [...rankings].sort((a, b) => {
      const dif = acumDe(b) - acumDe(a)
      if (dif !== 0) return dif
      // Mismos desempates que la tabla oficial, importados y no copiados.
      return compareByTiebreak(a, b)
    })
    // Los empatados en puntos comparten puesto.
    let puesto = 1
    return ordenadas.map((player, i) => {
      if (i > 0 && acumDe(ordenadas[i - 1]) !== acumDe(player)) puesto = i + 1
      return { player, posicion: puesto }
    })
  })()

  const deltaFor = (player: PlayerRanking) => player.positionsChanged

  const mesasFinalesFor = (player: PlayerRanking) =>
    completedDates.filter(d => (player.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, player.playerId) ?? 999) <= MESA_FINAL_THRESHOLD).length

  const leader = rankings.find(r => r.position === 1)
  const second = rankings.find(r => r.position === 2)
  const third = rankings.find(r => r.position === 3)

  /** Encabezados neutros salvo PUNTOS, que lleva el rojo del club. */
  const thStyle: React.CSSProperties = {
    background: HEADER_BG,
    color: '#F5EFE6',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: '0.03em',
    textAlign: 'center',
    padding: '8px 5px',
    border: `1px solid ${GRID}`,
    whiteSpace: 'nowrap'
  }

  const thPointsStyle: React.CSSProperties = {
    ...thStyle,
    background: RED_DEEP,
    color: '#fff'
  }

  const tdStyle: React.CSSProperties = {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
    padding: '7px 5px',
    border: `1px solid ${GRID}`,
    background: '#fff'
  }

  const viewNote = (() => {
    if (view === 'fechas') {
      return 'Las fechas tachadas son las que se descartan. PROM es el promedio de las fechas jugadas.'
    }
    if (view === 'acum') {
      return `Ordenado por ${SCORE_LABELS.accumulated}: todos los puntos, sin descartar ninguna fecha. No es la tabla oficial — DIF es lo que te quita el ELIMINA.`
    }
    if (view === 'elimina') {
      return hasPenalties
        ? `${SCORE_LABELS.points} = ${SCORE_LABELS.accumulated} menos las fechas descartadas y las multas de puntos.`
        : `${SCORE_LABELS.points} = ${SCORE_LABELS.accumulated} menos las fechas descartadas.`
    }
    return eliminasActive
      ? `${SCORE_LABELS.points} es lo que manda: tus mejores ${bestOf} fechas de ${totalDates}.`
      : `${SCORE_LABELS.points} es lo que manda. Las ${datesToEliminate} peores fechas se empiezan a descartar a mitad del torneo.`
  })()

  const handleDownloadCsv = () => {
    const headers = [
      '#',
      'Jugador',
      'Puntos',
      ...completedDates.map(d => `F${d}`),
      'Prom',
      'E1',
      'E2',
      ...(showElimina3 ? ['E3'] : []),
      ...(hasPenalties ? ['Multa'] : []),
      'Acumulado'
    ]
    const rows = rankings.map(player => [
      player.position,
      player.playerName,
      scoreOf(player),
      ...completedDates.map(d => player.pointsByDate[d] ?? 0),
      Math.round(averagePointsPerDate(player)),
      player.elimina1 ?? 0,
      player.elimina2 ?? 0,
      ...(showElimina3 ? [player.elimina3 ?? 0] : []),
      ...(hasPenalties ? [player.pointPenalty ?? 0] : []),
      player.totalPoints
    ])
    downloadCsv(headers, rows, `tabla-torneo-${tournamentNumber}.csv`)
  }

  return (
    <div className="space-y-4 pt-2">
      {/* LIDER */}
      {leader && (() => {
        const delta = deltaFor(leader)
        const mesasFinales = mesasFinalesFor(leader)
        const podios = leader.firstPlaces + leader.secondPlaces + leader.thirdPlaces
        return (
          <button
            onClick={() => goToPlayer(leader.playerId)}
            className="w-full text-left relative overflow-hidden"
            style={{
              ...tile('negro'),
              borderRadius: 20,
              padding: 14,
              minHeight: 118
            }}
          >
            {leader.playerPhoto && (
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '38%' }}>
                <Image src={leader.playerPhoto} alt={leader.playerName} fill className="object-cover object-top" unoptimized />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #17120F 0%, rgba(23,18,15,0.55) 34%, transparent 70%)' }} />
              </div>
            )}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: leader.playerPhoto ? '62%' : '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13 }}>👑</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>LÍDER DEL TORNEO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span className="cp-score" style={{ fontSize: 30, color: '#FFF' }}>#1</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>{shortenFullName(leader.playerName)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="cp-score" style={{ fontSize: 22, color: GOLD }}>{scoreOf(leader)}</span>
                <span style={{ fontSize: 12, color: SOBRE_COLOR.tenue }}>{SCORE_LABELS.points}</span>
                {delta !== 0 && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: delta > 0 ? GREEN_ON_DARK : ORANGE_ON_DARK, marginLeft: 4 }}>
                    {delta > 0 ? `+${delta} ▲` : `${delta} ▼`} <span style={{ fontWeight: 500, color: SOBRE_COLOR.tenue }}>posiciones vs fecha anterior</span>
                  </span>
                )}
              </div>
              {leader.playerAlias && (
                <div style={{ fontSize: 13, color: GOLD, fontStyle: 'italic', marginTop: 6 }}>&ldquo;{leader.playerAlias}&rdquo;</div>
              )}
            </div>
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                gap: 8,
                marginTop: 12,
                paddingTop: 10,
                borderTop: SOBRE_COLOR.linea
              }}
            >
              {[
                { v: mesasFinales, l: 'MESAS FINALES' },
                { v: podios, l: 'PODIOS' },
                { v: leader.firstPlaces, l: 'VICTORIAS' }
              ].map(({ v, l }) => (
                <div key={l} style={{ flex: 1, minWidth: 0 }}>
                  <div className="cp-score" style={{ fontSize: 17, color: '#FFF', lineHeight: 1.1 }}>{v}</div>
                  <div style={{ fontSize: 12, color: SOBRE_COLOR.tenue, letterSpacing: '0.03em' }}>{l}</div>
                </div>
              ))}
            </div>
          </button>
        )
      })()}

      {/* #2 / #3 */}
      {(second || third) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {[second, third].filter((p): p is PlayerRanking => !!p).map(player => {
            const delta = deltaFor(player)
            const medal = player.position === 2 ? SILVER : BRONZE
            // el borde puede ir en el metal vivo; el numero no, ahi no se lee
            const medalTexto = player.position === 2 ? PAPER_SILVER : PAPER_BRONZE
            return (
              <button
                key={player.playerId}
                onClick={() => goToPlayer(player.playerId)}
                className="flex-1 text-left"
                style={{
                  ...tile('papel', 1),
                  borderRadius: 16,
                  border: `1px solid ${medal}`,
                  padding: 12,
                  flexDirection: 'row',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <CircleAvatar photoUrl={player.playerPhoto} name={player.playerName} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div className="cp-score" style={{ fontSize: 13, color: medalTexto }}>#{player.position}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cp-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shortenFullName(player.playerName)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="cp-score" style={{ fontSize: 15, color: 'var(--cp-on-surface)' }}>{scoreOf(player)}</span>
                    <span style={{ fontSize: 12, color: 'var(--cp-on-surface-variant)' }}>{SCORE_LABELS.pointsShort}</span>
                    {delta !== 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: delta > 0 ? PAPER_GREEN : PAPER_ORANGE }}>
                        {delta > 0 ? `+${delta} ▲` : `${delta} ▼`}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* SELECTOR DE DETALLE + CSV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: view === v.id ? '#fff' : 'var(--cp-on-surface-muted)',
                background: view === v.id ? RED_DEEP : 'var(--cp-surface-2)',
                border: 'none',
                borderRadius: 100,
                padding: '7px 13px',
                cursor: 'pointer'
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleDownloadCsv}
          aria-label="Descargar la tabla completa en CSV"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--cp-on-surface-muted)',
            background: 'var(--cp-surface-1)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: 100,
            padding: '7px 12px',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <Download size={13} /> CSV
        </button>
      </div>

      {/* QUÉ ESTOY MIRANDO — siempre visible, en tamaño de lectura */}
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#9A8F8B', margin: '-4px 2px 0' }}>{viewNote}</p>

      {/* TABLA */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${GRID}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            className="w-full"
            style={{ borderCollapse: 'collapse', minWidth: view === 'fechas' ? 460 : undefined }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36 }}>#</th>
                <th style={{ ...thStyle, textAlign: 'left', width: view === 'resumen' ? 110 : 84 }}>JUGADOR</th>
                <th style={{ ...thPointsStyle, width: 52 }}>{view === 'acum' ? SCORE_LABELS.accumulated : SCORE_LABELS.points}</th>

                {view === 'fechas' && completedDates.map(d => (
                  <th key={d} style={{ ...thStyle, width: 36 }}>F{d}</th>
                ))}
                {view === 'fechas' && <th style={{ ...thStyle, width: 46 }}>PROM</th>}

                {view === 'acum' && <th style={{ ...thStyle, width: 54 }}>{SCORE_LABELS.points}</th>}
                {view === 'acum' && <th style={{ ...thStyle, width: 46 }}>DIF</th>}
                {view === 'elimina' && <th style={{ ...thStyle, width: 54 }}>{SCORE_LABELS.accumulated}</th>}
                {view === 'elimina' && <th style={{ ...thStyle, width: 40 }}>E1</th>}
                {view === 'elimina' && <th style={{ ...thStyle, width: 40 }}>E2</th>}
                {view === 'elimina' && showElimina3 && <th style={{ ...thStyle, width: 40 }}>E3</th>}
                {view === 'elimina' && hasPenalties && <th style={{ ...thStyle, width: 46 }}>MULTA</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map(({ player, posicion }, index) => {
                const isCurrentUser = currentUserId && player.playerId === currentUserId
                const isMalazo = posicion > rankings.length - 2
                const rowBg = isCurrentUser ? 'rgba(229,57,53,0.85)' : isMalazo ? '#FDEBEE' : index % 2 === 1 ? '#F7F7F7' : '#fff'
                const textColor = isCurrentUser ? '#fff' : '#000'
                const badge = medalBadgeStyle(posicion)
                // En ACUM. manda el total real; en el resto, el puntaje oficial.
                const points = view === 'acum' ? acumDe(player) : scoreOf(player)
                const prom = Math.round(averagePointsPerDate(player))
                const eliminated = view === 'fechas' ? eliminatedDateNumbers(player, datesToEliminate) : null
                // La franja dorada marca la columna que manda; en la fila propia
                // el rojo ya destaca, así que no se pisan.
                const pointsBg = isCurrentUser ? rowBg : POINTS_TINT
                const eliminaColor = player.eliminasActive ? ORANGE : INACTIVE_TEXT
                /**
                 * Durante una fecha en curso los ELIMINA se muestran contando
                 * la proyeccion de hoy: es lo que de verdad se descartaria si
                 * el jugador sale ahora. Van en ambar para no confundirlos con
                 * el dato cerrado.
                 */
                const proj = player.liveProjection
                const eliminaOf = (n: 1 | 2 | 3) => {
                  const projected = proj ? proj[`elimina${n}` as const] : undefined
                  const real = player[`elimina${n}` as const]
                  const value = proj ? projected : real
                  return {
                    text: value !== undefined ? `−${value}` : '—',
                    color: proj
                      ? PROJECTED
                      : (isCurrentUser ? 'rgba(255,255,255,0.85)' : eliminaColor),
                    italic: Boolean(proj),
                  }
                }

                return (
                  <tr key={player.playerId} onClick={() => goToPlayer(player.playerId)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...tdStyle, background: rowBg }}>
                      {isMalazo ? (
                        <span style={{ fontSize: 15 }}>💀</span>
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 800, fontSize: 13, ...badge }}>
                          {posicion}
                        </div>
                      )}
                    </td>

                    <td style={{ ...tdStyle, background: rowBg, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: textColor }}>
                        <CircleAvatar photoUrl={player.playerPhoto} name={player.playerName} size={view === 'resumen' ? 26 : 22} />
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }}>
                          {view === 'resumen' ? player.playerName : shortenFullName(player.playerName)}
                          {isCurrentUser && ' (Tú)'}
                        </span>
                      </div>
                    </td>

                    {/* PUNTOS — el número que manda */}
                    <td style={{ ...tdStyle, background: pointsBg, color: textColor, fontWeight: 900, fontSize: 14 }}>
                      {points}
                    </td>

                    {view === 'fechas' && completedDates.map(d => {
                      const isEliminated = eliminated?.has(d)
                      // Sigue en la mesa esta fecha: se muestra lo que se
                      // llevaria si sale ahora, marcado como proyeccion.
                      const proj = player.liveProjection?.dateNumber === d &&
                        player.pointsByDate[d] === undefined
                        ? player.liveProjection
                        : null
                      return (
                        <td
                          key={d}
                          style={{
                            ...tdStyle,
                            background: rowBg,
                            color: proj
                              ? PROJECTED
                              : isEliminated ? (isCurrentUser ? 'rgba(255,255,255,0.55)' : '#B0B0B0') : textColor,
                            fontStyle: proj ? 'italic' : undefined,
                            textDecoration: isEliminated ? 'line-through' : undefined
                          }}
                          title={proj ? `Proyectado: ${proj.points} si sale ${proj.position}º` : undefined}
                        >
                          {proj ? proj.points : (player.pointsByDate[d] ?? '—')}
                        </td>
                      )
                    })}
                    {view === 'fechas' && <td style={{ ...tdStyle, background: rowBg, color: textColor }}>{prom}</td>}

                    {view === 'acum' && (() => {
                      // Cuanto separa el total real del puntaje que manda: lo
                      // que el ELIMINA descarta, mas las multas.
                      const oficial = scoreOf(player)
                      const dif = acumDe(player) - oficial
                      return (
                        <>
                          <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : textColor, fontWeight: 500 }}>
                            {oficial}
                          </td>
                          <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? 'rgba(255,255,255,0.85)' : (dif > 0 ? ORANGE : INACTIVE_TEXT) }}>
                            {dif > 0 ? `−${dif}` : '—'}
                          </td>
                        </>
                      )
                    })()}

                    {view === 'elimina' && (
                      <td style={{ ...tdStyle, background: rowBg, color: proj ? PROJECTED : (isCurrentUser ? 'rgba(255,255,255,0.8)' : ORANGE), fontWeight: 500, fontStyle: proj ? 'italic' : undefined }}>
                        {proj ? player.totalPoints + proj.points : player.totalPoints}
                      </td>
                    )}
                    {view === 'elimina' && (() => {
                      const cell = eliminaOf(1)
                      return (
                        <td style={{ ...tdStyle, background: rowBg, color: cell.color, fontStyle: cell.italic ? 'italic' : undefined }}>
                          {cell.text}
                        </td>
                      )
                    })()}
                    {view === 'elimina' && (() => {
                      const cell = eliminaOf(2)
                      return (
                        <td style={{ ...tdStyle, background: rowBg, color: cell.color, fontStyle: cell.italic ? 'italic' : undefined }}>
                          {cell.text}
                        </td>
                      )
                    })()}
                    {view === 'elimina' && showElimina3 && (() => {
                      const cell = eliminaOf(3)
                      return (
                        <td style={{ ...tdStyle, background: rowBg, color: cell.color, fontStyle: cell.italic ? 'italic' : undefined }}>
                          {cell.text}
                        </td>
                      )
                    })()}
                    {view === 'elimina' && hasPenalties && (
                      <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? 'rgba(255,255,255,0.85)' : ORANGE }}>
                        {(player.pointPenalty ?? 0) > 0 ? `−${player.pointPenalty}` : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hasLiveProjection && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: '#9A8F8B', margin: '0 2px' }}>
          Hay una fecha en juego. En{' '}
          <span style={{ color: PROJECTED, fontStyle: 'italic', fontWeight: 600 }}>ámbar y cursiva</span>{' '}
          va lo proyectado: lo que se llevaría cada uno si sale ahora. La tabla no cambia
          hasta que la fecha termine.
        </p>
      )}

      {view === 'elimina' && !eliminasActive && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: '#9A8F8B', margin: '0 2px' }}>
          En gris, las fechas que se descartarían: todavía no se restan de {SCORE_LABELS.points}. Empiezan a contar a mitad
          del torneo.
        </p>
      )}
    </div>
  )
}

export default CPRankingView
