'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import { playedDateNumbers, nightlyPosition, averagePointsPerDate } from '@/lib/ranking-utils'
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
const SILVER = '#B9B9C4'
const BRONZE = '#C98A4E'
const MESA_FINAL_THRESHOLD = 9

type TableView = 'compacta' | 'completa'

function medalBadgeStyle(position: number) {
  if (position === 1) return { background: GOLD, color: '#1A1512' }
  if (position === 2) return { background: SILVER, color: '#1A1512' }
  if (position === 3) return { background: BRONZE, color: '#1A1512' }
  return { background: '#2A292B', color: '#F5EFE6' }
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
  const [view, setView] = useState<TableView>('compacta')

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
        <p className="mt-1" style={{ fontSize: 11, color: '#7A6E62' }}>{errorMessage}</p>
        <button onClick={() => refresh()} className="mt-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${RED}`, color: RED, fontSize: 12 }}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!rankingData || rankingData.rankings.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 14, color: '#7A6E62' }}>No hay datos de tabla disponibles.</p>
      </div>
    )
  }

  const { rankings, tournament } = rankingData
  const completedDates = playedDateNumbers(rankings)

  const deltaFor = (player: PlayerRanking) => player.positionsChanged

  const mesasFinalesFor = (player: PlayerRanking) =>
    completedDates.filter(d => (player.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, player.playerId) ?? 999) <= MESA_FINAL_THRESHOLD).length

  // Mismo criterio que calculateTournamentRanking: ordenar por puntos ascendente
  // (sort estable → en empate gana la fecha más antigua, igual que el servidor).
  const eliminatedDatesFor = (player: PlayerRanking): Set<number> => {
    if (!player.eliminasActive || tournament.datesToEliminate <= 0) return new Set()
    const dateNumbers = Object.keys(player.pointsByDate).map(Number).sort((a, b) => a - b)
    const sorted = [...dateNumbers].sort((a, b) => (player.pointsByDate[a] ?? 0) - (player.pointsByDate[b] ?? 0))
    return new Set(sorted.slice(0, tournament.datesToEliminate))
  }

  const leader = rankings.find(r => r.position === 1)
  const second = rankings.find(r => r.position === 2)
  const third = rankings.find(r => r.position === 3)

  const thStyle: React.CSSProperties = {
    background: RED,
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.03em',
    textAlign: 'center',
    padding: '8px 5px',
    border: `1px solid ${GRID}`,
    whiteSpace: 'nowrap'
  }

  const thNeutralStyle: React.CSSProperties = {
    ...thStyle,
    background: '#2A292B'
  }

  const tdStyle: React.CSSProperties = {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
    padding: '7px 5px',
    border: `1px solid ${GRID}`,
    background: '#fff'
  }

  const handleDownloadCsv = () => {
    const headers = ['#', 'Jugador', 'Final', ...completedDates.map(d => `F${d}`), 'Prom']
    const rows = rankings.map(player => {
      const pts = player.finalScore ?? player.totalPoints
      const prom = Math.round(averagePointsPerDate(player))
      return [player.position, player.playerName, pts, ...completedDates.map(d => player.pointsByDate[d] ?? 0), prom]
    })
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
              background: 'linear-gradient(135deg, #1e1600 0%, #241a02 60%, #1c1400 100%)',
              border: `1.5px solid ${GOLD}`,
              boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 0 30px rgba(232,193,88,0.10)`,
              padding: 14,
              minHeight: 118
            }}
          >
            {leader.playerPhoto && (
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '38%' }}>
                <Image src={leader.playerPhoto} alt={leader.playerName} fill className="object-cover object-top" unoptimized />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #1e1600 0%, transparent 55%)' }} />
              </div>
            )}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: leader.playerPhoto ? '62%' : '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13 }}>👑</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>LÍDER DEL TORNEO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>#1</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#F5EFE6' }}>{shortName(leader.playerName)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>{leader.finalScore ?? leader.totalPoints}</span>
                <span style={{ fontSize: 9, color: '#A89A8C' }}>PUNTOS</span>
                {delta !== 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: delta > 0 ? '#7CD07F' : RED, marginLeft: 4 }}>
                    {delta > 0 ? `+${delta} ▲` : `${delta} ▼`} <span style={{ fontWeight: 500, color: '#7A6E62' }}>posiciones vs fecha anterior</span>
                  </span>
                )}
              </div>
              {leader.playerAlias && (
                <div style={{ fontSize: 11, color: '#C9B27A', fontStyle: 'italic', marginTop: 6 }}>&ldquo;{leader.playerAlias}&rdquo;</div>
              )}
            </div>
            <div style={{ position: 'absolute', top: 14, right: 14, textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{mesasFinales}</div>
              <div style={{ fontSize: 7, color: '#A89A8C', letterSpacing: '0.04em' }}>MESAS FINALES</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginTop: 4 }}>{podios}</div>
              <div style={{ fontSize: 7, color: '#A89A8C', letterSpacing: '0.04em' }}>PODIOS</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginTop: 4 }}>{leader.firstPlaces}</div>
              <div style={{ fontSize: 7, color: '#A89A8C', letterSpacing: '0.04em' }}>VICTORIAS</div>
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
                  background: '#2A292B',
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
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#F5EFE6' }}>{player.finalScore ?? player.totalPoints}</span>
                    <span style={{ fontSize: 8, color: '#7A6E62' }}>PTS</span>
                    {delta !== 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: delta > 0 ? '#7CD07F' : RED }}>
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

      {/* SELECTOR + CSV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['compacta', 'completa'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: view === v ? '#fff' : '#B5A996',
                background: view === v ? RED : 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 100,
                padding: '7px 12px',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          onClick={handleDownloadCsv}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
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

      {/* TABLA */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${GRID}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: view === 'completa' ? 500 : undefined }}>
            <thead>
              <tr>
                <th style={{ ...thNeutralStyle, width: 36 }}>#</th>
                <th style={{ ...thNeutralStyle, textAlign: 'left', width: 110 }}>JUGADOR</th>
                <th style={{ ...thStyle, width: 46 }}>FINAL</th>
                {view === 'completa' && completedDates.map(d => (
                  <th key={d} style={{ ...thNeutralStyle, width: 36 }}>F{d}</th>
                ))}
                {view === 'completa' && <th style={{ ...thNeutralStyle, width: 46 }}>PROM</th>}
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, index) => {
                const isCurrentUser = currentUserId && player.playerId === currentUserId
                const isMalazo = player.position > rankings.length - 2
                const rowBg = isCurrentUser ? 'rgba(229,57,53,0.85)' : isMalazo ? '#FDEBEE' : index % 2 === 1 ? '#F7F7F7' : '#fff'
                const textColor = isCurrentUser ? '#fff' : '#000'
                const badge = medalBadgeStyle(player.position)
                const pts = player.finalScore ?? player.totalPoints
                const prom = Math.round(averagePointsPerDate(player))
                const eliminatedDates = view === 'completa' ? eliminatedDatesFor(player) : null

                return (
                  <tr key={player.playerId} onClick={() => goToPlayer(player.playerId)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...tdStyle, background: rowBg }}>
                      {isMalazo ? (
                        <span style={{ fontSize: 15 }}>💀</span>
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 800, fontSize: 11, ...badge }}>
                          {player.position}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, background: rowBg, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: textColor }}>
                        <CircleAvatar photoUrl={player.playerPhoto} name={player.playerName} />
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }}>
                          {player.playerName}
                          {isCurrentUser && ' (Tú)'}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, background: rowBg, color: isCurrentUser ? '#fff' : '#000', fontWeight: 900 }}>{pts}</td>
                    {view === 'completa' && completedDates.map(d => {
                      const isEliminated = eliminatedDates?.has(d)
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
                    {view === 'completa' && <td style={{ ...tdStyle, background: rowBg, color: textColor }}>{prom}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {view === 'completa' && (
        <p style={{ fontSize: 9, color: '#7A6E62', textAlign: 'center' }}>
          Las fechas <span style={{ textDecoration: 'line-through' }}>tachadas</span> son las que cada jugador elimina de su puntaje.
        </p>
      )}
    </div>
  )
}

export default CPRankingView
