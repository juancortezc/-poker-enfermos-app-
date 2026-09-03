'use client'

import useSWR from 'swr'
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
  onSeeCalendar: () => void
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D8A84E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
  onSeeCalendar,
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

  const formattedDate = formatDate(nextDate?.scheduledDate ?? null)
  const days = daysUntil(nextDate?.scheduledDate ?? null)

  const highlightCards = [
    droughtLeader && {
      key: 'drought',
      icon: <ClockIcon />,
      iconBg: 'rgba(229,57,53,0.14)',
      text: (
        <>
          {droughtLeader.firstName} lleva <span style={{ color: '#E53935' }}>{droughtLeader.daysWithoutVictory} días</span> sin ganar una fecha
        </>
      )
    },
    seasonHighlights?.longestTop3Streak && {
      key: 'top3streak',
      icon: <span style={{ fontSize: 15 }}>🔥</span>,
      iconBg: 'rgba(76,175,80,0.14)',
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
      iconBg: 'rgba(216,168,78,0.14)',
      text: (
        <>
          La racha más grande de la temporada:{' '}
          <span style={{ color: '#D8A84E' }}>+{seasonHighlights.biggestJump.positionsChanged} posiciones</span> (
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
          padding: '20px 16px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D8A84E' }}>Próxima fecha</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#F5EFE6', marginTop: 4, letterSpacing: '-0.01em' }}>
          {formattedDate ?? 'Por definir'}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#A89A8C', marginTop: 2 }}>
          {days !== null ? `Faltan ${days} ${days === 1 ? 'día' : 'días'}` : 'Sin fecha programada'}
          {nextDate?.dateNumber ? ` · Fecha ${nextDate.dateNumber}` : ''}
        </div>
        <button
          onClick={onSeeCalendar}
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#E53935',
            color: '#fff',
            padding: '9px 16px',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.03em',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          VER CALENDARIO
        </button>
      </div>

      {/* PERSONAL STATS */}
      {myRanking && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'linear-gradient(160deg,#E53935,#B32623)', borderRadius: 16, padding: 14, color: '#fff' }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{myRanking.playerName.split(' ')[0]}, estás</div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 2 }}>#{myRanking.position}</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75, marginTop: 2 }}>En el campeonato</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6 }}>{scoreOf(myRanking)} puntos</div>
          </div>
          <HomeCard style={{ flex: 1, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A89A8C' }}>Te separan del líder</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#F5EFE6', letterSpacing: '-0.02em', marginTop: 2 }}>
              {gapToLeader ?? 0} <span style={{ fontSize: 14, fontWeight: 700 }}>{gapToLeader === 1 ? 'pt' : 'pts'}</span>
            </div>
            <LinkCta onClick={onOpenProfile} style={{ marginTop: 8 }}>VER MI PERFIL →</LinkCta>
          </HomeCard>
        </div>
      )}

      <PodioTorneoCard tournamentNumber={tournamentNumber} top3={rankings.slice(0, 3)} onSeeAll={onSeeFullTable} />

      {streaks && <StreaksCards hot={streaks.hot} cold={streaks.cold} onSeeAllHot={onSeeFullTable} />}

      {highlightCards.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '0 2px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.04em' }}>LA TEMPORADA EN NÚMEROS</div>
            <span style={{ fontSize: 14 }}>📊</span>
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
