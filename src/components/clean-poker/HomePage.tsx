'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'

import { CPHeader } from './CPHeader'
import { CPBottomNav } from './CPBottomNav'
import { CPAppShell } from './CPAppShell'
import { PositionCard } from './PositionCard'
import { PodioCard } from './PodioCard'
import { MalazoCard } from './MalazoCard'
import { LiveGameCard } from './LiveGameCard'
import { LeaderCard } from './LeaderCard'
import { CPPlayerDetailModal } from './CPPlayerDetailModal'

// Logo URL
const LOGO_URL = 'https://storage.googleapis.com/poker-enfermos/logo.png'

interface ActiveGameDate {
  id: number
  dateNumber: number
  scheduledDate: string | null
  status: 'CREATED' | 'in_progress'
  playerIds: string[]
  playersCount: number
  tournament: {
    id: number
    name: string
    number: number
  }
}

interface Elimination {
  id: number
  eliminatedPlayerId: string
  eliminatorPlayerId: string
  position: number
  points: number
  eliminatedPlayer: {
    firstName: string
    lastName: string
  }
  eliminatorPlayer: {
    firstName: string
    lastName: string
  }
}


export function HomePage() {
  const { user, loading: authLoading } = useAuth()

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
    progress,
    nextDate: nextGameDateFromTournament
  } = useActiveTournament({ refreshInterval: 300000 }) // 5 minutes

  const {
    ranking: rankingData,
    isLoading: rankingLoading,
    getTopPlayers
  } = useTournamentRanking(activeTournament?.id || null, {
    refreshInterval: 300000 // 5 minutes
  })

  // Fetch active game date
  const { data: activeGameDate } = useSWR<ActiveGameDate | null>(
    '/api/game-dates/active',
    { refreshInterval: 60000 } // 1 minute for game status
  )


  // Fetch eliminations for live game (only refreshes during live games)
  const { data: eliminations } = useSWR<Elimination[]>(
    activeGameDate?.status === 'in_progress'
      ? `/api/eliminations/game-date/${activeGameDate.id}`
      : null,
    { refreshInterval: 15000 } // 15 seconds during live games
  )

  // Loading state
  if (authLoading || tournamentLoading) {
    return <HomeLoading />
  }

  // Estado A: No logueado
  if (!user) {
    return (
      <HomeNotAuthenticated
        leader={rankingData?.rankings?.[0]}
        gamesPlayed={progress?.completed || 0}
        totalGames={progress?.total || 12}
      />
    )
  }

  // Get current user's ranking
  const myRanking = rankingData?.rankings?.find(r => r.playerId === user.id)
  const top3 = getTopPlayers(3)
  const rankings = rankingData?.rankings || []
  const leaderPoints = rankings[0]?.finalScore ?? rankings[0]?.totalPoints ?? 0
  const lastPoints = rankings[rankings.length - 1]?.finalScore ?? rankings[rankings.length - 1]?.totalPoints ?? 0
  const isCommission = user.role === 'Comision'
  const isGameLive = activeGameDate?.status === 'in_progress'

  // Get bottom 2 players (7/2 - malazos)
  const bottom2 = rankings.length >= 2 ? rankings.slice(-2) : []

  // Calculate live game stats
  const playersRemaining = activeGameDate
    ? activeGameDate.playersCount - (eliminations?.length || 0)
    : 0

  const lastElimination = eliminations?.[0]
    ? {
        eliminatedPlayer: `${eliminations[0].eliminatedPlayer.firstName} ${eliminations[0].eliminatedPlayer.lastName}`,
        eliminatedPosition: eliminations[0].position,
        eliminatorPlayer: `${eliminations[0].eliminatorPlayer.firstName} ${eliminations[0].eliminatorPlayer.lastName}`,
        pointsAwarded: eliminations[0].points
      }
    : null

  // Format next date with date number
  const formatNextDate = (dateNumber: number | undefined, dateStr: string | null) => {
    if (!dateStr) return 'Por definir'
    const date = new Date(dateStr)
    const formattedDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    return dateNumber ? `${dateNumber}: ${formattedDate}` : formattedDate
  }

  // Estado C: Fecha en vivo
  if (isGameLive && activeGameDate) {
    return (
      <HomeWithLiveGame
        user={user}
        myRanking={myRanking}
        top3={top3}
        leaderPoints={leaderPoints}
        lastPoints={lastPoints}
        isCommission={isCommission}
        tournamentNumber={activeTournament?.number ?? 29}
        activeGameDate={activeGameDate}
        playersRemaining={playersRemaining}
        lastElimination={lastElimination}
        tournamentId={activeTournament?.id || 0}
      />
    )
  }

  // Estado B: Logueado sin fecha activa
  return (
    <HomeAuthenticated
      user={user}
      myRanking={myRanking}
      top3={top3}
      bottom2={bottom2}
      leaderPoints={leaderPoints}
      lastPoints={lastPoints}
      isCommission={isCommission}
      tournamentNumber={activeTournament?.number ?? 29}
      nextDate={formatNextDate(nextGameDateFromTournament?.dateNumber, nextGameDateFromTournament?.scheduledDate ?? null)}
      nextDateScheduled={nextGameDateFromTournament?.scheduledDate ?? null}
      hasActiveDate={!!activeGameDate}
      tournamentId={activeTournament?.id || 0}
    />
  )
}

// ============================================
// LOADING STATE
// ============================================
function HomeLoading() {
  return (
    <CPAppShell>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: 'var(--cp-surface-border)',
              borderTopColor: 'var(--cp-primary)'
            }}
          />
          <p
            style={{
              fontSize: 'var(--cp-body-size)',
              color: 'var(--cp-on-surface-variant)'
            }}
          >
            Cargando...
          </p>
        </div>
      </div>
    </CPAppShell>
  )
}

// ============================================
// NEXT DATE WITH CALENDAR BUTTON
// ============================================
interface NextDateWithCalendarProps {
  nextDate: string // Format: "8: 20 de enero" or "Por definir"
  scheduledDate?: string | null // ISO date string for calendar
}

function NextDateWithCalendar({ nextDate, scheduledDate }: NextDateWithCalendarProps) {
  const handleAddToCalendar = () => {
    if (!scheduledDate) return

    const eventDate = new Date(scheduledDate)
    const endDate = new Date(eventDate)
    endDate.setHours(endDate.getHours() + 4) // 4 hour event

    // Format dates for calendar URL
    const formatDateForCal = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const title = encodeURIComponent(`Poker Enfermos - Fecha ${nextDate.split(':')[0]}`)
    const startStr = formatDateForCal(eventDate)
    const endStr = formatDateForCal(endDate)

    // Use Google Calendar URL which works on both iOS and Android
    // iOS will offer to open in native calendar app
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}`

    window.open(calendarUrl, '_blank')
  }

  const canAddToCalendar = nextDate !== 'Por definir' && scheduledDate

  return (
    <div className="flex items-center justify-center gap-2">
      <p
        style={{
          fontSize: 'var(--cp-body-size)',
          color: 'var(--cp-on-surface-variant)',
        }}
      >
        Próxima Fecha: {nextDate}
      </p>
      {canAddToCalendar && (
        <button
          onClick={handleAddToCalendar}
          className="p-1.5 rounded-full transition-all hover:bg-white/10 active:scale-95"
          aria-label="Agregar al calendario"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--cp-primary)' }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="12" y1="14" x2="12" y2="18" />
            <line x1="10" y1="16" x2="14" y2="16" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ============================================
// ESTADO A: NO LOGUEADO (Landing)
// ============================================
interface HomeNotAuthenticatedProps {
  leader?: {
    playerName: string
    totalPoints: number
    finalScore?: number
  }
  gamesPlayed: number
  totalGames: number
}

function HomeNotAuthenticated({ leader, gamesPlayed, totalGames }: HomeNotAuthenticatedProps) {
  return (
    <CPAppShell>
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-6">
        <Image
          src={LOGO_URL}
          alt="Poker Enfermos"
          width={80}
          height={80}
          className="rounded-full"
        />
      </div>

      {/* Title */}
      <h1
        className="font-bold mb-1"
        style={{
          fontSize: 'var(--cp-title-size)',
          color: 'var(--cp-on-surface)'
        }}
      >
        POKER ENFERMOS
      </h1>
      <p
        className="mb-8"
        style={{
          fontSize: 'var(--cp-body-size)',
          color: 'var(--cp-on-surface-variant)'
        }}
      >
        Temporada 29
      </p>

      {/* Leader Card */}
      {leader && (
        <div className="w-full max-w-sm mb-6">
          <LeaderCard
            name={leader.playerName}
            points={leader.finalScore ?? leader.totalPoints}
            gamesPlayed={gamesPlayed}
            totalGames={totalGames}
          />
        </div>
      )}

      {/* CTA Button */}
      <Link
        href="/api/auth/login"
        className="w-full max-w-sm py-3 text-center font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
        style={{
          backgroundColor: 'var(--cp-primary)',
          color: 'var(--cp-on-primary)',
          borderRadius: 'var(--cp-radius-full)',
          fontSize: 'var(--cp-body-size)',
        }}
      >
        Ingresar
      </Link>
      </div>
    </CPAppShell>
  )
}

// ============================================
// ESTADO B: LOGUEADO (Sin fecha activa)
// ============================================
interface HomeAuthenticatedProps {
  user: {
    id: string
    firstName?: string
    photoUrl?: string
  }
  myRanking?: {
    position: number
    playerName: string
    totalPoints: number
    finalScore?: number
    positionsChanged: number
  }
  top3: Array<{
    position: number
    playerName: string
    playerId: string
    totalPoints: number
    finalScore?: number
    positionsChanged: number
    playerPhoto?: string
    victories?: number
    podiums?: number
  }>
  bottom2: Array<{
    position: number
    playerName: string
    playerId: string
    totalPoints: number
    finalScore?: number
    positionsChanged: number
    playerPhoto?: string
    lastPlaces?: number
    absences?: number
  }>
  leaderPoints: number
  lastPoints: number
  isCommission: boolean
  tournamentNumber: number
  nextDate: string
  nextDateScheduled?: string | null
  hasActiveDate: boolean
  tournamentId: number
}

function HomeAuthenticated({
  user,
  myRanking,
  top3,
  bottom2,
  leaderPoints,
  lastPoints,
  isCommission,
  tournamentNumber,
  nextDate,
  nextDateScheduled,
  hasActiveDate,
  tournamentId
}: HomeAuthenticatedProps) {
  const [showDetailModal, setShowDetailModal] = useState(false)
  const userInitials = user.firstName?.slice(0, 2).toUpperCase() || 'PE'

  return (
    <CPAppShell>
      {/* Header */}
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isCommission}
        hasActiveGameDate={hasActiveDate}
      />

      {/* Content */}
      <main className="pb-20 px-4 space-y-4">
        {/* Next Date with Calendar */}
        <NextDateWithCalendar nextDate={nextDate} scheduledDate={nextDateScheduled} />

        {/* Mi Posición */}
        {myRanking && (
          <PositionCard
            position={myRanking.position}
            totalPoints={myRanking.totalPoints}
            finalPoints={myRanking.finalScore ?? myRanking.totalPoints}
            trend={myRanking.positionsChanged}
            leaderPoints={leaderPoints}
            lastPoints={lastPoints}
            onDetailClick={() => setShowDetailModal(true)}
          />
        )}

        {/* Podio */}
        {top3.length > 0 && (
          <PodioCard
            tournamentNumber={tournamentNumber}
            players={top3.map((p, idx) => ({
              position: idx + 1,
              name: p.playerName,
              photoUrl: p.playerPhoto,
              totalPoints: p.totalPoints,
              finalPoints: p.finalScore ?? p.totalPoints,
              trend: p.positionsChanged,
              victories: p.victories ?? 0,
              podiums: p.podiums ?? 0,
            }))}
          />
        )}

        {/* 7/2 - Malazos */}
        {bottom2.length >= 2 && (
          <MalazoCard
            players={bottom2.map((p) => ({
              position: p.position,
              name: p.playerName,
              photoUrl: p.playerPhoto,
              totalPoints: p.totalPoints,
              finalPoints: p.finalScore ?? p.totalPoints,
              trend: p.positionsChanged,
              lastPlaces: p.lastPlaces ?? 0,
              absences: p.absences ?? 0,
            }))}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav />

      {/* Player Detail Modal */}
      <CPPlayerDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        playerId={user.id}
        tournamentId={tournamentId}
      />
    </CPAppShell>
  )
}

// ============================================
// ESTADO C: LOGUEADO (Fecha en vivo)
// ============================================
interface HomeWithLiveGameProps {
  user: {
    id: string
    firstName?: string
    photoUrl?: string
  }
  myRanking?: {
    position: number
    playerName: string
    totalPoints: number
    finalScore?: number
    positionsChanged: number
  }
  top3: Array<{
    position: number
    playerName: string
    playerId: string
    totalPoints: number
    finalScore?: number
    positionsChanged: number
    playerPhoto?: string
    victories?: number
    podiums?: number
  }>
  leaderPoints: number
  lastPoints: number
  isCommission: boolean
  tournamentNumber: number
  activeGameDate: ActiveGameDate
  playersRemaining: number
  lastElimination: {
    eliminatedPlayer: string
    eliminatedPosition: number
    eliminatorPlayer: string
    pointsAwarded: number
  } | null
  tournamentId: number
}

function HomeWithLiveGame({
  user,
  myRanking,
  top3,
  leaderPoints,
  lastPoints,
  isCommission,
  tournamentNumber,
  activeGameDate,
  playersRemaining,
  lastElimination,
  tournamentId
}: HomeWithLiveGameProps) {
  const [showDetailModal, setShowDetailModal] = useState(false)
  const userInitials = user.firstName?.slice(0, 2).toUpperCase() || 'PE'

  return (
    <CPAppShell>
      {/* Header */}
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isCommission}
        hasActiveGameDate={true}
      />

      {/* Content */}
      <main className="pb-20 px-4 space-y-4">
        {/* Live Game Card */}
        <LiveGameCard
          dateNumber={activeGameDate.dateNumber}
          playersRemaining={playersRemaining}
          playersTotal={activeGameDate.playersCount}
          lastElimination={lastElimination}
        />

        {/* Mi Posición */}
        {myRanking && (
          <PositionCard
            position={myRanking.position}
            totalPoints={myRanking.totalPoints}
            finalPoints={myRanking.finalScore ?? myRanking.totalPoints}
            trend={myRanking.positionsChanged}
            leaderPoints={leaderPoints}
            lastPoints={lastPoints}
            onDetailClick={() => setShowDetailModal(true)}
          />
        )}

        {/* Podio */}
        {top3.length > 0 && (
          <PodioCard
            tournamentNumber={tournamentNumber}
            players={top3.map((p, idx) => ({
              position: idx + 1,
              name: p.playerName,
              photoUrl: p.playerPhoto,
              totalPoints: p.totalPoints,
              finalPoints: p.finalScore ?? p.totalPoints,
              trend: p.positionsChanged,
              victories: p.victories ?? 0,
              podiums: p.podiums ?? 0,
            }))}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav />

      {/* Player Detail Modal */}
      <CPPlayerDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        playerId={user.id}
        tournamentId={tournamentId}
      />
    </CPAppShell>
  )
}

export default HomePage
