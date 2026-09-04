'use client'

import useSWR from 'swr'
import { CalendarPlus } from 'lucide-react'
import type { PlayerRanking, PlayerPositionDelta, TournamentInsightsData } from '@/lib/ranking-utils'
import { PodioTorneoCard } from './PodioTorneoCard'
import { StreaksCards } from './StreaksCards'
import { HomeCard } from './HomeCard'
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
  streaks?: { hot: PlayerPositionDelta[]; cold: PlayerPositionDelta[] }
  seasonHighlights?: TournamentInsightsData['seasonHighlights']
  onOpenProfile: () => void
  onOpenCalendarPage: () => void
  onAddToPersonalCalendar: () => void
  onSeeFullTable: () => void
}

const scoreOf = (r: PlayerRanking) => r.finalScore ?? r.totalPoints

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

/** Fechas (números) en las que al menos un jugador registró puntos. */
function playedDateNumbers(rankings: PlayerRanking[]): number[] {
  const set = new Set<number>()
  rankings.forEach(r => Object.keys(r.pointsByDate).forEach(d => set.add(Number(d))))
  return Array.from(set).sort((a, b) => a - b)
}

/** Puesto del jugador esa noche puntual (según puntos de esa fecha), o null si no jugó. */
function nightlyPosition(rankings: PlayerRanking[], dateNumber: number, playerId: string): number | null {
  const entries = rankings
    .map(r => ({ playerId: r.playerId, points: r.pointsByDate[dateNumber] }))
    .filter((e): e is { playerId: string; points: number } => typeof e.points === 'number' && e.points > 0)
  if (entries.length === 0) return null
  entries.sort((a, b) => b.points - a.points)
  const idx = entries.findIndex(e => e.playerId === playerId)
  return idx === -1 ? null : idx + 1
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
  onSeeFullTable
}: HomeTorneoProps) {
  const { data: droughtData } = useSWR<DaysWithoutVictoryResponse>(
    tournamentId ? `/api/stats/days-without-victory/${tournamentId}` : null,
    { revalidateOnFocus: false }
  )

  const droughtLeader = droughtData?.players.find(p => !p.hasNeverWon)

  const myRanking = rankings.find(r => r.playerId === user.id)
  const leaderScore = rankings.length ? scoreOf(rankings[0]) : 0
  const gapToLeader = myRanking ? leaderScore - scoreOf(myRanking) : null

  const sortedByPosition = [...rankings].sort((a, b) => a.position - b.position)
  const penultimate = sortedByPosition.length >= 2 ? sortedByPosition[sortedByPosition.length - 2] : null
  const isNearBottom = myRanking && penultimate ? myRanking.position >= penultimate.position : false
  const gapToMalazos = myRanking && penultimate && !isNearBottom ? scoreOf(myRanking) - scoreOf(penultimate) : null

  const eliminaSum = myRanking?.eliminasActive
    ? (myRanking.elimina1 ?? 0) + (myRanking.elimina2 ?? 0) + (myRanking.elimina3 ?? 0)
    : 0

  // Forma reciente: rendimiento noche a noche (independiente del puntaje acumulado de temporada)
  const playedDates = playedDateNumbers(rankings)
  const eliminatedDatesCount = myRanking?.eliminasActive ? (myRanking.elimina3 !== undefined ? 3 : 2) : 0
  const countedDates = myRanking ? Math.max(1, myRanking.datesPlayed - eliminatedDatesCount) : 1
  const avgPointsPerDate = myRanking ? scoreOf(myRanking) / countedDates : null

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
          <span style={{ color: '#4CAF50' }}>{seasonHighlights.longestTop3Streak.streakLength} fechas seguidas</span> en el Top 3
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

  return (
    <>
      {/* NEXT DATE HERO */}
      <div
        style={{
          background: 'linear-gradient(155deg,#2D2C2E,#242226)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 18,
          padding: '14px 16px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#E8C158' }}>Próxima fecha</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F5EFE6', marginTop: 2, letterSpacing: '-0.01em' }}>
            {formattedDate ?? 'Por definir'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#A89A8C', marginTop: 2 }}>
            {days !== null ? `Faltan ${days} ${days === 1 ? 'día' : 'días'}` : 'Sin fecha programada'}
            {nextDate?.dateNumber ? ` · Fecha ${nextDate.dateNumber}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onAddToPersonalCalendar}
            title="Guarda esta fecha en tu calendario"
            aria-label="Guarda esta fecha en tu calendario"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '50%',
              color: '#A89A8C',
              cursor: 'pointer'
            }}
          >
            <CalendarPlus size={14} />
          </button>
          <button
            onClick={onOpenCalendarPage}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#E53935',
              color: '#fff',
              padding: '7px 12px',
              borderRadius: 100,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.02em',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            CALENDARIO T{tournamentNumber}
          </button>
        </div>
      </div>

      {/* PERSONAL STATS */}
      {myRanking && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'linear-gradient(160deg,#E53935,#B32623)', borderRadius: 16, padding: 14, color: '#fff' }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{myRanking.playerName.split(' ')[0]}, estás</div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 2 }}>#{myRanking.position}</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75, marginTop: 2, marginBottom: 8 }}>En el campeonato</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ opacity: 0.75 }}>Última fecha</span>
                <span style={{ fontWeight: 800 }}>
                  {myRanking.positionsChanged === 0
                    ? 'sin cambios'
                    : `${myRanking.positionsChanged > 0 ? '+' : ''}${myRanking.positionsChanged} pos`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ opacity: 0.75 }}>Puesto promedio</span>
                <span style={{ fontWeight: 800 }}>{avgNightlyPosition !== null ? `#${avgNightlyPosition.toFixed(1)}` : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ opacity: 0.75 }}>Prom. por fecha*</span>
                <span style={{ fontWeight: 800 }}>{avgPointsPerDate !== null ? `${avgPointsPerDate.toFixed(1)} pts` : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ opacity: 0.75 }}>Últimas 3 fechas</span>
                <span style={{ fontWeight: 800 }}>{last3 ? `${last3.mine}/${last3.max} pts` : '—'}</span>
              </div>
            </div>
            <div style={{ fontSize: 8, opacity: 0.5, marginTop: 6 }}>*sin contar fechas eliminadas</div>
          </div>
          <HomeCard style={{ flex: 1, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A89A8C' }}>Tus puntos</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#F5EFE6', letterSpacing: '-0.02em', marginTop: 2 }}>
              {scoreOf(myRanking)} <span style={{ fontSize: 13, fontWeight: 700 }}>pts</span>
            </div>
            {eliminaSum > 0 && (
              <div style={{ fontSize: 10, fontWeight: 600, color: '#A89A8C', marginTop: 2 }}>Eliminas {eliminaSum} pts</div>
            )}
            <div style={{ fontSize: 9, fontWeight: 500, color: '#7A6E62', marginTop: 1 }}>Sin eliminar: {myRanking.totalPoints} pts</div>

            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 9, color: '#A89A8C' }}>
                Te separan del líder: <span style={{ fontWeight: 800, color: '#F5EFE6' }}>{gapToLeader ?? 0} {gapToLeader === 1 ? 'pt' : 'pts'}</span>
              </div>
              {gapToMalazos !== null && (
                <div style={{ fontSize: 9, color: '#7A6E62', marginTop: 2 }}>
                  {gapToMalazos} {gapToMalazos === 1 ? 'pt' : 'pts'} de la zona 7/2
                </div>
              )}
            </div>
            <LinkCta onClick={onOpenProfile} style={{ marginTop: 8 }}>VER MI PERFIL →</LinkCta>
          </HomeCard>
        </div>
      )}

      <PodioTorneoCard tournamentNumber={tournamentNumber} top3={rankings.slice(0, 3)} onSeeAll={onSeeFullTable} />

      {streaks && <StreaksCards hot={streaks.hot} cold={streaks.cold} />}

      {highlightCards.length > 0 && (
        <div>
          <div style={{ marginBottom: 10, padding: '0 2px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.04em' }}>LA TEMPORADA EN NÚMEROS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {highlightCards.map(card => (
              <HomeCard key={card.key} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {card.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: '#F5EFE6' }}>{card.text}</div>
              </HomeCard>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default HomeTorneo
