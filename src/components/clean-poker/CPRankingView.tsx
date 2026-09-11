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
  SCORE_LABELS
} from '@/lib/ranking-utils'
import type { PlayerRanking } from '@/lib/ranking-utils'
import { downloadCsv } from '@/lib/csv'

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
const PAPER_GREEN = '#136B34'
const PAPER_ORANGE = '#A8360A'
const INACTIVE_TEXT = '#9A8F8B'
const MESA_FINAL_THRESHOLD = 9

/**
 * Una sola tabla con tres niveles de detalle. Todas ordenan por PUNTOS —
 * lo que cambia es cuánto se abre la información alrededor de ese número.
 */
type TableView = 'resumen' | 'fechas' | 'elimina'

const VIEWS: { id: TableView; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'fechas', label: 'Fechas' },
  { id: 'elimina', label: 'Elimina' }
]

function medalBadgeStyle(position: number) {
  if (position === 1) return { background: GOLD, color: '#1A1512' }
  if (position === 2) return { background: SILVER, color: '#1A1512' }
  if (position === 3) return { background: BRONZE, color: '#1A1512' }
  return { background: '#382E2C', color: '#F5EFE6' }
}

function shortName(full: string) {
  const p = full.split(' ').filter(Boolean)
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]
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
      <div className="p-6 text-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
      <div className="p-6 text-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
              borderRadius: 18,
              background: 'linear-gradient(135deg, #FDFAF5 0%, #F9F3E9 60%, #F6EFE2 100%)',
              border: `1.5px solid ${PAPER_GOLD}`,
              boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(127,93,7,0.10)`,
              padding: 14,
              minHeight: 118
            }}
          >
            {leader.playerPhoto && (
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '38%' }}>
                <Image src={leader.playerPhoto} alt={leader.playerName} fill className="object-cover object-top" unoptimized />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #FDFAF5 0%, rgba(253,250,245,0.55) 38%, transparent 62%)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #F6EFE2 0%, transparent 34%)' }} />
              </div>
            )}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: leader.playerPhoto ? '62%' : '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13 }}>👑</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: PAPER_GOLD, letterSpacing: '0.1em' }}>LÍDER DEL TORNEO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: PAPER_INK }}>#1</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: PAPER_INK }}>{shortName(leader.playerName)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: PAPER_GOLD }}>{scoreOf(leader)}</span>
                <span style={{ fontSize: 12, color: PAPER_INK_2 }}>{SCORE_LABELS.points}</span>
                {delta !== 0 && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: delta > 0 ? PAPER_GREEN : PAPER_ORANGE, marginLeft: 4 }}>
                    {delta > 0 ? `+${delta} ▲` : `${delta} ▼`} <span style={{ fontWeight: 500, color: PAPER_INK_2 }}>posiciones vs fecha anterior</span>
                  </span>
                )}
              </div>
              {leader.playerAlias && (
                <div style={{ fontSize: 13, color: PAPER_GOLD, fontStyle: 'italic', marginTop: 6 }}>&ldquo;{leader.playerAlias}&rdquo;</div>
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
                borderTop: '1px solid rgba(127,93,7,0.22)'
              }}
            >
              {[
                { v: mesasFinales, l: 'MESAS FINALES' },
                { v: podios, l: 'PODIOS' },
                { v: leader.firstPlaces, l: 'VICTORIAS' }
              ].map(({ v, l }) => (
                <div key={l} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: PAPER_INK, lineHeight: 1.1 }}>{v}</div>
                  <div style={{ fontSize: 12, color: PAPER_INK_2, letterSpacing: '0.03em' }}>{l}</div>
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
            return (
              <button
                key={player.playerId}
                onClick={() => goToPlayer(player.playerId)}
                className="flex-1 text-left"
                style={{
                  borderRadius: 16,
                  background: '#382E2C',
                  border: `1px solid ${medal}55`,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <CircleAvatar photoUrl={player.playerPhoto} name={player.playerName} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: medal }}>#{player.position}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F5EFE6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shortName(player.playerName)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#F5EFE6' }}>{scoreOf(player)}</span>
                    <span style={{ fontSize: 12, color: '#9A8F8B' }}>{SCORE_LABELS.pointsShort}</span>
                    {delta !== 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: delta > 0 ? GREEN_ON_DARK : ORANGE_ON_DARK }}>
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
                color: view === v.id ? '#fff' : '#9A8F8B',
                background: view === v.id ? RED : 'rgba(255,255,255,0.06)',
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
            color: '#F5EFE6',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
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
                <th style={{ ...thPointsStyle, width: 52 }}>{SCORE_LABELS.points}</th>

                {view === 'fechas' && completedDates.map(d => (
                  <th key={d} style={{ ...thStyle, width: 36 }}>F{d}</th>
                ))}
                {view === 'fechas' && <th style={{ ...thStyle, width: 46 }}>PROM</th>}

                {view === 'elimina' && <th style={{ ...thStyle, width: 54 }}>{SCORE_LABELS.accumulated}</th>}
                {view === 'elimina' && <th style={{ ...thStyle, width: 40 }}>E1</th>}
                {view === 'elimina' && <th style={{ ...thStyle, width: 40 }}>E2</th>}
                {view === 'elimina' && showElimina3 && <th style={{ ...thStyle, width: 40 }}>E3</th>}
                {view === 'elimina' && hasPenalties && <th style={{ ...thStyle, width: 46 }}>MULTA</th>}
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, index) => {
                const isCurrentUser = currentUserId && player.playerId === currentUserId
                const isMalazo = player.position > rankings.length - 2
                const rowBg = isCurrentUser ? 'rgba(229,57,53,0.85)' : isMalazo ? '#FDEBEE' : index % 2 === 1 ? '#F7F7F7' : '#fff'
                const textColor = isCurrentUser ? '#fff' : '#000'
                const badge = medalBadgeStyle(player.position)
                const points = scoreOf(player)
                const prom = Math.round(averagePointsPerDate(player))
                const eliminated = view === 'fechas' ? eliminatedDateNumbers(player, datesToEliminate) : null
                // La franja dorada marca la columna que manda; en la fila propia
                // el rojo ya destaca, así que no se pisan.
                const pointsBg = isCurrentUser ? rowBg : POINTS_TINT
                const eliminaColor = player.eliminasActive ? ORANGE : INACTIVE_TEXT

                return (
                  <tr key={player.playerId} onClick={() => goToPlayer(player.playerId)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...tdStyle, background: rowBg }}>
                      {isMalazo ? (
                        <span style={{ fontSize: 15 }}>💀</span>
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 800, fontSize: 13, ...badge }}>
                          {player.position}
                        </div>
                      )}
                    </td>

                    <td style={{ ...tdStyle, background: rowBg, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: textColor }}>
                        <CircleAvatar photoUrl={player.playerPhoto} name={player.playerName} size={view === 'resumen' ? 26 : 22} />
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }}>
                          {view === 'resumen' ? player.playerName : shortName(player.playerName)}
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
                      return (
                        <td
                          key={d}
                          style={{
                            ...tdStyle,
                            background: rowBg,
                            color: isEliminated ? (isCurrentUser ? 'rgba(255,255,255,0.55)' : '#B0B0B0') : textColor,
                            textDecoration: isEliminated ? 'line-through' : undefined
                          }}
                        >
                          {player.pointsByDate[d] ?? 0}
                        </td>
                      )
                    })}
                    {view === 'fechas' && <td style={{ ...tdStyle, background: rowBg, color: textColor }}>{prom}</td>}

                    {view === 'elimina' && (
                      <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : ORANGE, fontWeight: 500 }}>
                        {player.totalPoints}
                      </td>
                    )}
                    {view === 'elimina' && (
                      <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? 'rgba(255,255,255,0.85)' : eliminaColor }}>
                        {player.elimina1 !== undefined ? `−${player.elimina1}` : '—'}
                      </td>
                    )}
                    {view === 'elimina' && (
                      <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? 'rgba(255,255,255,0.85)' : eliminaColor }}>
                        {player.elimina2 !== undefined ? `−${player.elimina2}` : '—'}
                      </td>
                    )}
                    {view === 'elimina' && showElimina3 && (
                      <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? 'rgba(255,255,255,0.85)' : eliminaColor }}>
                        {player.elimina3 !== undefined ? `−${player.elimina3}` : '—'}
                      </td>
                    )}
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
