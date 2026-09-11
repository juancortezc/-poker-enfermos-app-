'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CalendarPlus } from 'lucide-react'
import type { PlayerRanking, PlayerPositionDelta, TournamentInsightsData } from '@/lib/ranking-utils'
import { playedDateNumbers, nightlyPosition, averagePointsPerDate, scoreOf, SCORE_LABELS } from '@/lib/ranking-utils'
import { Score, Meter } from './Score'
import { HomeAvatar } from './HomeAvatar'
import { LinkCta } from './LinkCta'
import { tile, overline, BENTO, SOBRE_COLOR } from './bento'

interface DaysWithoutVictoryResponse {
  players: Array<{ id: string; firstName: string; lastName: string; daysWithoutVictory: number; hasNeverWon: boolean }>
}

interface NextDateInfo {
  dateNumber?: number
  scheduledDate: string | null
}

interface HomeTorneoProps {
  user: { id: string }
  tournamentId: number
  tournamentNumber: number
  rankings: PlayerRanking[]
  nextDate: NextDateInfo | null
  streaks?: { hot: PlayerPositionDelta[] }
  seasonHighlights?: TournamentInsightsData['seasonHighlights']
  onOpenProfile: () => void
  onOpenCalendarPage: () => void
  onAddToPersonalCalendar: () => void
  onSeeTabla: () => void
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cp-primary-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cp-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diffMs = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function HomeTorneo({
  user,
  tournamentId,
  tournamentNumber,
  rankings,
  nextDate,
  streaks,
  seasonHighlights,
  onOpenProfile,
  onOpenCalendarPage,
  onAddToPersonalCalendar,
  onSeeTabla
}: HomeTorneoProps) {
  const { data: droughtData } = useSWR<DaysWithoutVictoryResponse>(
    tournamentId ? `/api/stats/days-without-victory/${tournamentId}` : null,
    { revalidateOnFocus: false }
  )

  const droughtLeader = droughtData?.players.find(p => !p.hasNeverWon)

  const myRanking = rankings.find(r => r.playerId === user.id)
  const leaderScore = rankings.length ? scoreOf(rankings[0]) : 0
  const gapToLeader = myRanking ? leaderScore - scoreOf(myRanking) : null


  // 7/2: los últimos 2 lugares de la tabla actual (no un dato de tendencia)
  const bottom2 = rankings.length >= 2
    ? [...rankings].sort((a, b) => b.position - a.position).slice(0, 2).reverse()
    : []

  const sortedByPosition = [...rankings].sort((a, b) => a.position - b.position)
  const penultimate = sortedByPosition.length >= 2 ? sortedByPosition[sortedByPosition.length - 2] : null
  const isNearBottom = myRanking && penultimate ? myRanking.position >= penultimate.position : false
  const gapToMalazos = myRanking && penultimate && !isNearBottom ? scoreOf(myRanking) - scoreOf(penultimate) : null

  // Forma reciente: rendimiento noche a noche (independiente del puntaje acumulado de temporada)
  const playedDates = playedDateNumbers(rankings)
  const avgPointsPerDate = myRanking ? averagePointsPerDate(myRanking) : null

  const myPlayedDates = myRanking
    ? playedDates.filter(d => (myRanking.pointsByDate[d] ?? 0) > 0)
    : []
  const avgNightlyPosition = myRanking && myPlayedDates.length > 0
    ? myPlayedDates.reduce((sum, d) => sum + (nightlyPosition(rankings, d, myRanking.playerId) ?? 0), 0) / myPlayedDates.length
    : null

  const last3Dates = playedDates.slice(-3)
  const last3 = myRanking
    ? last3Dates.reduce(
        (acc, d) => {
          const mine = myRanking.pointsByDate[d] ?? 0
          const max = Math.max(0, ...rankings.map(r => r.pointsByDate[d] ?? 0))
          return { mine: acc.mine + mine, max: acc.max + max }
        },
        { mine: 0, max: 0 }
      )
    : null

  const formattedDate = formatDate(nextDate?.scheduledDate ?? null)
  const days = daysUntil(nextDate?.scheduledDate ?? null)

  const highlightCards = [
    droughtLeader && {
      key: 'drought',
      icon: <ClockIcon />,
      text: (
        <>
          {droughtLeader.firstName} lleva <span style={{ color: 'var(--cp-primary-light)', fontWeight: 700 }}>{droughtLeader.daysWithoutVictory} días</span> sin ganar una fecha
        </>
      )
    },
    seasonHighlights?.longestTop3Streak && {
      key: 'top3streak',
      icon: <span style={{ fontSize: 15 }}>🔥</span>,
      text: (
        <>
          {seasonHighlights.longestTop3Streak.playerName.split(' ')[0]} lleva{' '}
          <span style={{ color: 'var(--cp-positive)', fontWeight: 700 }}>{seasonHighlights.longestTop3Streak.streakLength} fechas seguidas</span> en el Top 3
        </>
      )
    },
    seasonHighlights?.biggestJump && {
      key: 'biggestjump',
      icon: <TrophyIcon />,
      text: (
        <>
          La racha más grande de la temporada:{' '}
          <span style={{ color: 'var(--cp-gold)', fontWeight: 700 }}>+{seasonHighlights.biggestJump.positionsChanged} posiciones</span> (
          {seasonHighlights.biggestJump.playerName.split(' ')[0]}, Fecha {seasonHighlights.biggestJump.dateNumber})
        </>
      )
    }
  ].filter((c): c is NonNullable<typeof c> => Boolean(c))

  const podio = sortedByPosition.slice(0, 3)
  const [abierto, setAbierto] = useState<string | null>(null)

  const CICLO = 14
  const avance = days !== null ? Math.max(0, Math.min(1, 1 - days / CICLO)) : 0
  const R = 30
  const CIRC = 2 * Math.PI * R

  const tinta = 'var(--cp-on-surface)'
  const suave = 'var(--cp-on-surface-muted)'
  const tenue = 'var(--cp-on-surface-variant)'

  return (
    <div style={BENTO}>

      {/* ── TU POSICIÓN — el ancla negra ──────────────────────────── */}
      {myRanking && (
        <section className="cp-rise" style={{ ...tile('negro'), animationDelay: '0ms' }}>
          <span
            aria-hidden
            className="cp-score"
            style={{ position: 'absolute', right: -14, top: -26, fontSize: 150, color: 'rgba(255,255,255,0.05)', lineHeight: 1, pointerEvents: 'none' }}
          >
            {myRanking.position}
          </span>
          <div style={overline(SOBRE_COLOR.tenue)}>{myRanking.playerName.split(' ')[0]}, estás</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginTop: 4, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <span className="cp-score" style={{ fontSize: 34, color: '#FF5A56', lineHeight: 1.2 }}>#</span>
              <Score value={myRanking.position} size={82} color="#FFF" style={{ lineHeight: 0.9 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <Score value={scoreOf(myRanking)} size={26} color="#FFF" />
                <span style={overline(SOBRE_COLOR.tenue)}>{SCORE_LABELS.points}</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {SCORE_LABELS.accumulatedLong} <span style={{ color: '#FF9E5E', fontWeight: 700 }}>{myRanking.totalPoints}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 14, paddingTop: 11, borderTop: '1px solid rgba(255,255,255,0.14)', position: 'relative' }}>
            {[
              { v: myRanking.positionsChanged, l: 'última fecha', signo: true },
              { v: avgNightlyPosition !== null ? Math.round(avgNightlyPosition) : null, l: 'puesto prom.', prefijo: '#' },
              { v: avgPointsPerDate !== null ? Math.round(avgPointsPerDate) : null, l: 'prom./fecha' },
              { v: last3 ? last3.mine : null, l: 'últimas 3' }
            ].map((m, k) => (
              <div key={m.l} style={{ flex: 1, minWidth: 0, paddingLeft: k === 0 ? 0 : 10, borderLeft: k === 0 ? 'none' : '1px solid rgba(255,255,255,0.14)' }}>
                <div className="cp-score" style={{
                  fontSize: 18,
                  color: m.signo && typeof m.v === 'number' && m.v < 0 ? '#FF9E5E'
                       : m.signo && typeof m.v === 'number' && m.v > 0 ? '#6ECB71' : '#FFF'
                }}>
                  {m.v === null ? '—' : `${m.prefijo ?? ''}${m.signo && m.v > 0 ? '+' : ''}${m.v}`}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── EL ANILLO — bloque chico y cuadrado ───────────────────── */}
      {formattedDate && (
        <section className="cp-rise" style={{ ...tile('papel', 1), animationDelay: '60ms', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r={R} fill="none" stroke="var(--cp-surface-3)" strokeWidth="6" />
              <circle cx="36" cy="36" r={R} fill="none" stroke="var(--cp-primary)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - avance)}
                style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="cp-score" style={{ fontSize: 26, color: tinta, lineHeight: 1 }}>{days ?? '—'}</span>
              <span style={{ fontSize: 9, color: tenue, letterSpacing: '0.1em' }}>DÍAS</span>
            </div>
          </div>
          <div style={{ ...overline(), textAlign: 'center' }}>para la fecha</div>
        </section>
      )}

      {/* ── LA FECHA — bloque chico al lado ───────────────────────── */}
      {formattedDate && (
        <section className="cp-rise" style={{ ...tile('papel', 1), animationDelay: '110ms', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={overline()}>próxima</div>
            <div className="cp-display" style={{ fontSize: 20, fontWeight: 800, color: tinta, marginTop: 3, lineHeight: 1.1 }}>{formattedDate}</div>
            <div style={{ fontSize: 11.5, color: suave, marginTop: 3 }}>Fecha {nextDate?.dateNumber ?? '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onAddToPersonalCalendar} aria-label="Agregar a mi calendario"
              style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--cp-surface-border)', background: 'var(--cp-surface-2)', color: suave, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <CalendarPlus size={16} />
            </button>
            <LinkCta onClick={onOpenCalendarPage} style={{ fontSize: 11, color: 'var(--cp-primary-light)' }}>T{tournamentNumber}</LinkCta>
          </div>
        </section>
      )}

      {/* ── EL PODIO — bloque ancho, en oro ───────────────────────── */}
      {podio.length === 3 && (
        <section className="cp-rise" style={{ ...tile('oro'), animationDelay: '160ms' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={overline('#8A6508')}>el podio</span>
            <LinkCta onClick={onSeeTabla} style={{ color: '#C62828', fontSize: 11.5 }}>TABLA →</LinkCta>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginTop: 12 }}>
            {[podio[1], podio[0], podio[2]].map((p) => {
              const idx = podio.indexOf(p)
              const metal = ['#8A6508', '#6E6A67', '#8B5E2F'][idx]
              const primero = idx === 0
              const tam = primero ? 76 : 56
              const activo = abierto === p.playerId
              return (
                <button key={p.playerId} onClick={() => setAbierto(activo ? null : p.playerId)} aria-expanded={activo}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: primero ? 12 : 0, minWidth: 0 }}>
                  <div style={{ position: 'relative', borderRadius: '50%', padding: 3, border: `2px solid ${metal}`,
                    background: activo ? 'rgba(255,255,255,0.9)' : 'transparent',
                    transition: 'transform 200ms ease', transform: activo ? 'translateY(-3px)' : 'none' }}>
                    <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={tam} fontSize={primero ? 20 : 15} round />
                    <span className="cp-score" style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', background: metal, color: '#FFF', fontSize: 11, minWidth: 19, height: 19, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</span>
                  </div>
                  <div style={{ fontSize: primero ? 12.5 : 11.5, fontWeight: 700, color: tinta, textAlign: 'center', lineHeight: 1.2, marginTop: 3 }}>{p.playerName.split(' ')[0]}</div>
                  <div className="cp-score" style={{ fontSize: primero ? 19 : 15, color: metal }}>{scoreOf(p)}</div>
                </button>
              )
            })}
          </div>

          {abierto && (() => {
            const p = podio.find(x => x.playerId === abierto)
            if (!p) return null
            const podios = p.firstPlaces + p.secondPlaces + p.thirdPlaces
            return (
              <div className="cp-rise" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(138,101,8,0.22)', display: 'flex' }}>
                {[
                  { v: p.firstPlaces, l: 'victorias' },
                  { v: podios, l: 'podios' },
                  { v: p.totalPoints, l: 'acum.' },
                  { v: scoreOf(p) - (myRanking ? scoreOf(myRanking) : 0), l: 'vs vos', signo: true }
                ].map((m, k) => (
                  <div key={m.l} style={{ flex: 1, minWidth: 0, paddingLeft: k === 0 ? 0 : 8, borderLeft: k === 0 ? 'none' : '1px solid rgba(138,101,8,0.22)' }}>
                    <div className="cp-score" style={{ fontSize: 16, color: m.signo ? (m.v > 0 ? '#C2410C' : '#15803D') : tinta }}>
                      {m.signo && m.v > 0 ? '+' : ''}{m.v}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#7A6E69', marginTop: 1 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </section>
      )}

      {/* ── LOS MALAZOS — el bloque ROSA. No negociable. ──────────── */}
      {bottom2.length > 0 && (
        <section className="cp-rise" style={{ ...tile('rosa', 1), animationDelay: '220ms', gap: 10 }}>
          <span style={overline(SOBRE_COLOR.suave)}>malazos 7/2</span>
          {bottom2.map(p => (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ borderRadius: '50%', padding: 2, border: '2px solid rgba(255,255,255,0.75)', flexShrink: 0 }}>
                <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={32} fontSize={12} round />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.playerName.split(' ')[0]}</div>
                <div className="cp-score" style={{ fontSize: 14, color: '#FFF' }}>{scoreOf(p)}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── LOS CALIENTES — bloque verde, al lado del rosa ────────── */}
      {(streaks?.hot?.length ?? 0) > 0 && (
        <section className="cp-rise" style={{ ...tile('verde', 1), animationDelay: '260ms', gap: 10 }}>
          <span style={overline(SOBRE_COLOR.suave)}>calientes</span>
          {(streaks?.hot ?? []).slice(0, 2).map(p => (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ borderRadius: '50%', padding: 2, border: '2px solid rgba(255,255,255,0.75)', flexShrink: 0 }}>
                <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={32} fontSize={12} round />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.playerName.split(' ')[0]}</div>
                <div className="cp-score" style={{ fontSize: 14, color: '#FFF' }}>+{p.positionsChanged}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── TU CARRERA — bloque ancho con las barras ──────────────── */}
      {myRanking && (
        <section className="cp-rise" style={{ ...tile('papel'), animationDelay: '300ms', gap: 13 }}>
          <span style={overline()}>tu carrera</span>
          <Meter value={leaderScore > 0 ? scoreOf(myRanking) / leaderScore : 0}
            color="var(--cp-primary)" track="var(--cp-surface-3)"
            left={<span style={{ color: suave, whiteSpace: 'nowrap' }}>Hacia el líder</span>}
            right={<span className="cp-score" style={{ fontSize: 15, color: tinta }}>−{gapToLeader ?? 0}</span>} />
          {gapToMalazos !== null && (
            <Meter value={Math.max(0, Math.min(1, gapToMalazos / Math.max(leaderScore, 1)))}
              color="var(--cp-malazo)" track="var(--cp-surface-3)"
              left={<span style={{ color: suave, whiteSpace: 'nowrap' }}>Colchón sobre el 7/2</span>}
              right={<span className="cp-score" style={{ fontSize: 15, color: 'var(--cp-malazo-text)' }}>{gapToMalazos}</span>} />
          )}
          <LinkCta onClick={onOpenProfile} style={{ color: 'var(--cp-primary-light)', alignSelf: 'flex-start' }}>VER MI TORNEO →</LinkCta>
        </section>
      )}

      {/* ── DE LA TEMPORADA ──────────────────────────────────────── */}
      {highlightCards.length > 0 && (
        <section className="cp-rise" style={{ ...tile('papel'), animationDelay: '340ms', padding: '14px 16px' }}>
          <span style={overline()}>de la temporada</span>
          <div style={{ marginTop: 4 }}>
            {highlightCards.map((card, k) => (
              <div key={card.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: k === 0 ? 'none' : '1px solid var(--cp-surface-border)' }}>
                <span style={{ flexShrink: 0, display: 'flex' }}>{card.icon}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: suave, lineHeight: 1.4 }}>{card.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default HomeTorneo
