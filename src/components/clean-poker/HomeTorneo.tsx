'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CalendarPlus } from 'lucide-react'
import type { PlayerRanking, PlayerPositionDelta, TournamentInsightsData } from '@/lib/ranking-utils'
import { playedDateNumbers, nightlyPosition, averagePointsPerDate, scoreOf, SCORE_LABELS } from '@/lib/ranking-utils'
import { Score, Meter } from './Score'
import { HomeAvatar } from './HomeAvatar'
import { LinkCta } from './LinkCta'

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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E53935" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8C158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
      iconBg: 'rgba(229,57,53,0.24)',
      text: (
        <>
          {droughtLeader.firstName} lleva <span style={{ color: '#E53935' }}>{droughtLeader.daysWithoutVictory} días</span> sin ganar una fecha
        </>
      )
    },
    seasonHighlights?.longestTop3Streak && {
      key: 'top3streak',
      icon: <span style={{ fontSize: 15 }}>🔥</span>,
      iconBg: 'rgba(76,175,80,0.24)',
      text: (
        <>
          {seasonHighlights.longestTop3Streak.playerName.split(' ')[0]} lleva{' '}
          <span style={{ color: '#6ECB71' }}>{seasonHighlights.longestTop3Streak.streakLength} fechas seguidas</span> en el Top 3
        </>
      )
    },
    seasonHighlights?.biggestJump && {
      key: 'biggestjump',
      icon: <TrophyIcon />,
      iconBg: 'rgba(232,193,88,0.24)',
      text: (
        <>
          La racha más grande de la temporada:{' '}
          <span style={{ color: '#E8C158' }}>+{seasonHighlights.biggestJump.positionsChanged} posiciones</span> (
          {seasonHighlights.biggestJump.playerName.split(' ')[0]}, Fecha {seasonHighlights.biggestJump.dateNumber})
        </>
      )
    }
  ].filter((c): c is NonNullable<typeof c> => Boolean(c))

  const podio = sortedByPosition.slice(0, 3)
  const [abierto, setAbierto] = useState<string | null>(null)

  // Anillo de cuenta regresiva: 14 dias es el ciclo entre fechas del club.
  const CICLO = 14
  const avance = days !== null ? Math.max(0, Math.min(1, 1 - days / CICLO)) : 0
  const R = 26
  const CIRC = 2 * Math.PI * R

  const tinta = 'var(--cp-on-surface)'
  const suave = 'var(--cp-on-surface-muted)'
  const tenue = 'var(--cp-on-surface-variant)'
  const linea = '1px solid var(--cp-surface-border)'

  const overline: React.CSSProperties = {
    fontFamily: 'var(--cp-font-display)',
    fontSize: 11, fontWeight: 800, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: tenue
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

      {/* ── TU POSICIÓN ──────────────────────────────────────────────
          Sin tarjeta, directo sobre el papel. El salto de 11px a 96px es
          la jerarquía que faltaba: antes todo medía lo mismo. */}
      {myRanking && (
        <section className="cp-rise" style={{ animationDelay: '0ms' }}>
          <div style={overline}>{myRanking.playerName.split(' ')[0]}, estás</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <span className="cp-score" style={{ fontSize: 40, color: 'var(--cp-primary)', lineHeight: 1.15 }}>#</span>
              <Score value={myRanking.position} size={96} color={tinta} style={{ lineHeight: 0.88 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 8, flex: 1, minWidth: 0 }}>
              <div style={{ ...overline, fontSize: 10, color: suave }}>en el campeonato</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <Score value={scoreOf(myRanking)} size={26} color={tinta} />
                <span style={{ ...overline, fontSize: 10 }}>{SCORE_LABELS.points}</span>
              </div>
              <div style={{ fontSize: 12, color: suave }}>
                {SCORE_LABELS.accumulatedLong} <span style={{ color: 'var(--cp-negative)', fontWeight: 700 }}>{myRanking.totalPoints}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 0, marginTop: 16, borderTop: linea, paddingTop: 12 }}>
            {[
              { v: myRanking.positionsChanged, l: 'última fecha', signo: true },
              { v: avgNightlyPosition !== null ? Math.round(avgNightlyPosition) : null, l: 'puesto prom.', prefijo: '#' },
              { v: avgPointsPerDate !== null ? Math.round(avgPointsPerDate) : null, l: 'prom./fecha' },
              { v: last3 ? last3.mine : null, l: 'últimas 3' }
            ].map((m, k) => (
              <div key={m.l} style={{ flex: 1, minWidth: 0, paddingLeft: k === 0 ? 0 : 12, borderLeft: k === 0 ? 'none' : linea }}>
                <div className="cp-score" style={{
                  fontSize: 19,
                  color: m.signo && typeof m.v === 'number' && m.v < 0 ? 'var(--cp-negative)'
                       : m.signo && typeof m.v === 'number' && m.v > 0 ? 'var(--cp-positive)' : tinta
                }}>
                  {m.v === null ? '—' : `${m.prefijo ?? ''}${m.signo && m.v > 0 ? '+' : ''}${m.v}`}
                </div>
                <div style={{ fontSize: 11, color: tenue, marginTop: 1 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── PRÓXIMA FECHA ────────────────────────────────────────────
          Un anillo, no otro rectángulo. La cuenta regresiva se ve, no se lee. */}
      {formattedDate && (
        <section className="cp-rise" style={{ animationDelay: '70ms', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--cp-surface-3)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r={R} fill="none"
                stroke="var(--cp-primary)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - avance)}
                style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="cp-score" style={{ fontSize: 22, color: tinta, lineHeight: 1 }}>{days ?? '—'}</span>
              <span style={{ fontSize: 9, color: tenue, letterSpacing: '0.1em' }}>DÍAS</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={overline}>próxima fecha</div>
            <div className="cp-display" style={{ fontSize: 22, fontWeight: 800, color: tinta, marginTop: 1 }}>{formattedDate}</div>
            <div style={{ fontSize: 12, color: suave, marginTop: 1 }}>Fecha {nextDate?.dateNumber ?? '—'} · Torneo {tournamentNumber}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onAddToPersonalCalendar}
              aria-label="Agregar a mi calendario"
              style={{ width: 38, height: 38, borderRadius: '50%', border: linea, background: 'var(--cp-surface-1)', color: suave, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <CalendarPlus size={17} />
            </button>
            <LinkCta onClick={onOpenCalendarPage} style={{ fontSize: 11, color: tenue, justifyContent: 'center' }}>T{tournamentNumber}</LinkCta>
          </div>
        </section>
      )}

      {/* ── EL PODIO ─────────────────────────────────────────────────
          Con la forma de un podio: escalonado y en círculos. Tocar a alguien
          abre sus números acá mismo — no es un botón para irse a otro lado. */}
      {podio.length === 3 && (
        <section className="cp-rise" style={{ animationDelay: '140ms' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={overline}>el podio</span>
            <LinkCta onClick={onSeeTabla} style={{ color: 'var(--cp-primary-light)', fontSize: 12 }}>TABLA COMPLETA →</LinkCta>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginTop: 14 }}>
            {[podio[1], podio[0], podio[2]].map((p) => {
              const idx = podio.indexOf(p)
              const metal = ['var(--cp-gold)', 'var(--cp-silver)', 'var(--cp-bronze)'][idx]
              const primero = idx === 0
              const tam = primero ? 84 : 62
              const activo = abierto === p.playerId
              return (
                <button
                  key={p.playerId}
                  onClick={() => setAbierto(activo ? null : p.playerId)}
                  aria-expanded={activo}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 7, marginBottom: primero ? 14 : 0, flex: primero ? '0 0 auto' : '1 1 0', minWidth: 0
                  }}
                >
                  <div style={{
                    position: 'relative', borderRadius: '50%', padding: 3,
                    border: `2px solid ${metal}`,
                    boxShadow: activo ? `0 0 0 4px var(--cp-surface-2)` : 'none',
                    transition: 'box-shadow 200ms ease, transform 200ms ease',
                    transform: activo ? 'translateY(-3px)' : 'none'
                  }}>
                    <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={tam} fontSize={primero ? 22 : 16} round />
                    <span className="cp-score" style={{
                      position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                      background: metal, color: '#FFF', fontSize: 12, minWidth: 20, height: 20,
                      borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{idx + 1}</span>
                  </div>
                  <div style={{ fontSize: primero ? 13 : 12, fontWeight: 700, color: tinta, textAlign: 'center', lineHeight: 1.2, marginTop: 3 }}>
                    {p.playerName.split(' ')[0]}
                  </div>
                  <div className="cp-score" style={{ fontSize: primero ? 20 : 16, color: metal }}>{scoreOf(p)}</div>
                </button>
              )
            })}
          </div>

          {/* El panel se abre acá abajo, sin sacarte de la pantalla. */}
          {abierto && (() => {
            const p = podio.find(x => x.playerId === abierto)
            if (!p) return null
            const podios = p.firstPlaces + p.secondPlaces + p.thirdPlaces
            return (
              <div className="cp-rise" style={{ marginTop: 14, paddingTop: 12, borderTop: linea, display: 'flex', gap: 0 }}>
                {[
                  { v: p.firstPlaces, l: 'victorias' },
                  { v: podios, l: 'podios' },
                  { v: p.totalPoints, l: SCORE_LABELS.accumulatedLong.toLowerCase() },
                  { v: scoreOf(p) - (myRanking ? scoreOf(myRanking) : 0), l: 'vs vos', signo: true }
                ].map((m, k) => (
                  <div key={m.l} style={{ flex: 1, minWidth: 0, paddingLeft: k === 0 ? 0 : 10, borderLeft: k === 0 ? 'none' : linea }}>
                    <div className="cp-score" style={{ fontSize: 17, color: m.signo ? (m.v > 0 ? 'var(--cp-negative)' : 'var(--cp-positive)') : tinta }}>
                      {m.signo && m.v > 0 ? '+' : ''}{m.v}
                    </div>
                    <div style={{ fontSize: 11, color: tenue, marginTop: 1 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </section>
      )}

      {/* ── TU CARRERA ───────────────────────────────────────────────── */}
      {myRanking && (
        <section className="cp-rise" style={{ animationDelay: '210ms', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={overline}>tu carrera</span>
          <Meter
            value={leaderScore > 0 ? scoreOf(myRanking) / leaderScore : 0}
            color="var(--cp-primary)"
            track="var(--cp-surface-3)"
            left={<span style={{ color: suave, whiteSpace: 'nowrap' }}>Hacia el líder</span>}
            right={<span className="cp-score" style={{ fontSize: 15, color: tinta }}>−{gapToLeader ?? 0}</span>}
          />
          {gapToMalazos !== null && (
            <Meter
              value={Math.max(0, Math.min(1, gapToMalazos / Math.max(leaderScore, 1)))}
              color="var(--cp-malazo)"
              track="var(--cp-surface-3)"
              left={<span style={{ color: suave, whiteSpace: 'nowrap' }}>Colchón sobre el 7/2</span>}
              right={<span className="cp-score" style={{ fontSize: 15, color: 'var(--cp-malazo-text)' }}>{gapToMalazos}</span>}
            />
          )}
          <LinkCta onClick={onOpenProfile} style={{ color: 'var(--cp-primary-light)', alignSelf: 'flex-start' }}>VER MI TORNEO →</LinkCta>
        </section>
      )}

      {/* ── LOS MALAZOS ──────────────────────────────────────────────
          Rosa, el color del club para todo lo del 7/2. Chico y al margen:
          importa, pero no manda la pantalla. */}
      {bottom2.length > 0 && (
        <section className="cp-rise" style={{ animationDelay: '280ms' }}>
          <span style={{ ...overline, color: 'var(--cp-malazo-text)' }}>los malazos 7/2</span>
          <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
            {bottom2.map(p => (
              <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div style={{ borderRadius: '50%', padding: 2, border: '2px solid var(--cp-malazo)', flexShrink: 0 }}>
                  <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={36} fontSize={13} round />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tinta, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.playerName.split(' ')[0]}
                  </div>
                  <div className="cp-score" style={{ fontSize: 14, color: 'var(--cp-malazo-text)' }}>{scoreOf(p)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── LOS QUE VIENEN CALIENTES ─────────────────────────────── */}
      {(streaks?.hot?.length ?? 0) > 0 && (
        <section className="cp-rise" style={{ animationDelay: '315ms' }}>
          <span style={{ ...overline, color: 'var(--cp-positive)' }}>los que vienen calientes</span>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
            {(streaks?.hot ?? []).slice(0, 3).map(p => (
              <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div style={{ borderRadius: '50%', padding: 2, border: '2px solid var(--cp-positive)', flexShrink: 0 }}>
                  <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={36} fontSize={13} round />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tinta, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.playerName.split(' ')[0]}
                  </div>
                  <div className="cp-score" style={{ fontSize: 14, color: 'var(--cp-positive)' }}>+{p.positionsChanged}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DE LA TEMPORADA ──────────────────────────────────────────
          Sin tarjeta cada una: una lista con filete, que respira. */}
      {highlightCards.length > 0 && (
        <section className="cp-rise" style={{ animationDelay: '350ms' }}>
          <span style={overline}>de la temporada</span>
          <div style={{ marginTop: 8 }}>
            {highlightCards.map(card => (
              <div key={card.key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: linea }}>
                <span style={{ flexShrink: 0, display: 'flex' }}>{card.icon}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: suave, lineHeight: 1.45 }}>{card.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default HomeTorneo
