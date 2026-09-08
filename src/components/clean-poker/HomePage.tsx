'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import { useTournamentInsights } from '@/hooks/useTournamentInsights'
import useSWR from 'swr'
import Image from 'next/image'

import { CPHeader } from './CPHeader'
import { CPBottomNav } from './CPBottomNav'
import { CPAppShell } from './CPAppShell'
import { PositionCard } from './PositionCard'
import { PodioCard } from './PodioCard'
import { MalazoCard } from './MalazoCard'
import { LiveGameCard } from './LiveGameCard'
import { CelebrationsCard } from './CelebrationsCard'
import { PushActivationBanner } from './PushActivationBanner'
import { HomeViewToggle, type HomeView } from './HomeViewToggle'
import { HomeUltimaFecha } from './HomeUltimaFecha'
import { HomeTorneo } from './HomeTorneo'
import { isWithinRecapWindow, openAddToCalendar } from '@/lib/home-view'
import type { PlayerRanking, TournamentInsightsData } from '@/lib/ranking-utils'

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
    nextDate: nextGameDateFromTournament,
    lastCompletedDate
  } = useActiveTournament({ refreshInterval: 300000 }) // 5 minutes

  const {
    ranking: rankingData,
    isLoading: rankingLoading,
    getTopPlayers
  } = useTournamentRanking(activeTournament?.id || null, {
    refreshInterval: 300000 // 5 minutes
  })

  const { insights } = useTournamentInsights(activeTournament?.id || null)

  // Fetch active game date
  const { data: activeGameDate } = useSWR<ActiveGameDate | null>(
    '/api/game-dates/active',
    {
      refreshInterval: 30000, // 30 seconds for game status
      revalidateOnFocus: true // Refresh when user comes back to tab
    }
  )


  // Fetch eliminations for live game (only refreshes during live games)
  const { data: eliminations } = useSWR<Elimination[]>(
    activeGameDate?.status === 'in_progress'
      ? `/api/eliminations/game-date/${activeGameDate.id}`
      : null,
    {
      refreshInterval: 5000, // 5 seconds during live games for faster updates
      revalidateOnFocus: true, // Refresh when user comes back to the tab
      dedupingInterval: 2000 // Allow more frequent requests during live games
    }
  )

  // Loading state
  if (authLoading || tournamentLoading) {
    return <HomeLoading />
  }

  // Format next date for login screen
  const formatNextDateSimple = (dateNumber: number | undefined, dateStr: string | null) => {
    if (!dateStr) return 'Por definir'
    const date = new Date(dateStr)
    const formattedDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    return dateNumber ? `Fecha ${dateNumber}: ${formattedDate}` : formattedDate
  }

  // Estado A: No logueado
  if (!user) {
    return (
      <HomeNotAuthenticated
        leader={rankingData?.rankings?.[0]}
        nextDate={formatNextDateSimple(nextGameDateFromTournament?.dateNumber, nextGameDateFromTournament?.scheduledDate ?? null)}
        tournamentNumber={activeTournament?.number ?? 29}
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

  // Estado C: Fecha en vivo
  if (isGameLive && activeGameDate) {
    return (
      <HomeWithLiveGame
        user={user}
        myRanking={myRanking}
        top3={top3}
        bottom2={bottom2}
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
      isCommission={isCommission}
      tournamentNumber={activeTournament?.number ?? 29}
      tournamentId={activeTournament?.id || 0}
      rankings={rankings}
      lastCompletedDate={lastCompletedDate}
      nextDate={nextGameDateFromTournament ?? null}
      insights={insights}
      hasActiveDate={!!activeGameDate}
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
// ESTADO A: NO LOGUEADO (Landing con Login)
// ============================================
interface HomeNotAuthenticatedProps {
  leader?: {
    playerName: string
    totalPoints: number
    finalScore?: number
  }
  nextDate: string
  tournamentNumber: number
}

function HomeNotAuthenticated({ leader, nextDate, tournamentNumber }: HomeNotAuthenticatedProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
    setPin(value)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) return

    setLoading(true)
    setError('')

    const success = await login(pin)

    if (!success) {
      setError('PIN invalido')
      setPin('')
    }

    setLoading(false)
  }

  return (
    <CPAppShell>
      <div className="min-h-screen flex flex-col px-6 pt-16">
        {/* Logo - Grande y arriba */}
        <div className="flex justify-center mb-4">
          <Image
            src={LOGO_URL}
            alt="Poker Enfermos"
            width={140}
            height={140}
            className="rounded-full"
            priority
          />
        </div>

        {/* Title */}
        <h1
          className="font-bold text-center mb-1"
          style={{
            fontSize: '24px',
            color: 'var(--cp-on-surface)',
            letterSpacing: '0.05em'
          }}
        >
          POKER ENFERMOS
        </h1>
        <p
          className="text-center mb-8"
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-on-surface-variant)'
          }}
        >
          Temporada {tournamentNumber}
        </p>

        {/* PIN Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs mx-auto mb-8">
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            placeholder="Ingresa tu PIN"
            value={pin}
            onChange={handlePinChange}
            disabled={loading}
            autoComplete="off"
            className="w-full h-12 px-4 text-center text-lg rounded-xl transition-all focus:outline-none focus:ring-2"
            style={{
              background: 'var(--cp-surface)',
              border: error ? '1px solid #E53935' : '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: '18px',
              letterSpacing: '0.3em'
            }}
          />

          {/* Botón LOGIN */}
          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full flex items-center justify-center gap-2 touch-manipulation"
            style={{
              backgroundColor: pin.length === 4 ? '#E53935' : '#444444',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              marginTop: '16px',
              minHeight: '56px',
              opacity: loading || pin.length !== 4 ? 0.5 : 1,
              cursor: loading || pin.length !== 4 ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderTopColor: 'white'
                }}
              />
            ) : (
              'LOGIN'
            )}
          </button>

          {error && (
            <p className="text-center mt-3" style={{ color: '#E53935', fontSize: '13px' }}>
              {error}
            </p>
          )}
        </form>

        {/* Leader Info - Compact */}
        {leader && (
          <div className="text-center mb-4">
            <p
              style={{
                fontSize: '12px',
                color: 'var(--cp-on-surface-muted)',
                marginBottom: '4px'
              }}
            >
              Lider Actual
            </p>
            <p
              style={{
                fontSize: 'var(--cp-body-size)',
                color: 'var(--cp-on-surface)',
                fontWeight: 600
              }}
            >
              {leader.playerName}
            </p>
          </div>
        )}

        {/* Next Date Info */}
        <div className="text-center">
          <p
            style={{
              fontSize: '12px',
              color: 'var(--cp-on-surface-muted)',
              marginBottom: '4px'
            }}
          >
            Proxima Fecha
          </p>
          <p
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-variant)'
            }}
          >
            {nextDate}
          </p>
        </div>
      </div>
    </CPAppShell>
  )
}

// ============================================
// ESTADO B: LOGUEADO (Sin fecha activa) — Última Fecha / Torneo
// ============================================
interface HomeAuthenticatedProps {
  user: {
    id: string
    firstName?: string
    lastName?: string
    photoUrl?: string
  }
  isCommission: boolean
  tournamentNumber: number
  tournamentId: number
  rankings: PlayerRanking[]
  lastCompletedDate: { id: number; dateNumber: number; scheduledDate: string | null } | null
  nextDate: { dateNumber: number; scheduledDate: string | null } | null
  insights?: TournamentInsightsData
  hasActiveDate: boolean
}

function HomeAuthenticated({
  user,
  isCommission,
  tournamentNumber,
  tournamentId,
  rankings,
  lastCompletedDate,
  nextDate,
  insights,
  hasActiveDate,
}: HomeAuthenticatedProps) {
  const router = useRouter()
  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'

  const defaultView: HomeView = lastCompletedDate && isWithinRecapWindow(lastCompletedDate.scheduledDate) ? 'ultimaFecha' : 'torneo'
  const [view, setView] = useState<HomeView>(defaultView)

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
        {/* Celebrations - Birthdays (first position, dismissible) */}
        <CelebrationsCard />

        {/* Push opt-in - solo aparece si el usuario no tiene suscripción activa */}
        <PushActivationBanner />

        <HomeViewToggle value={view} onChange={setView} ultimaFechaDisabled={!lastCompletedDate} />

        {view === 'ultimaFecha' && lastCompletedDate ? (
          <HomeUltimaFecha
            user={user}
            tournamentNumber={tournamentNumber}
            rankings={rankings}
            lastCompletedDate={lastCompletedDate}
            streaks={insights?.streaks}
            onOpenProfile={() => router.push(`/players/${user.id}`)}
            onSeeAllResults={() => router.push('/fecha')}
            onSeeResultsTab={() => router.push('/fecha?tab=resultados')}
            onSeeTabla={() => router.push('/tabla')}
            onSeePosiciones={() => router.push('/ranking')}
          />
        ) : (
          <HomeTorneo
            user={user}
            tournamentId={tournamentId}
            tournamentNumber={tournamentNumber}
            rankings={rankings}
            nextDate={nextDate}
            streaks={insights?.streaks}
            seasonHighlights={insights?.seasonHighlights}
            onOpenProfile={() => router.push(`/players/${user.id}`)}
            onOpenCalendarPage={() => router.push('/calendario')}
            onAddToPersonalCalendar={() => openAddToCalendar(nextDate?.dateNumber, nextDate?.scheduledDate)}
            onSeeTabla={() => router.push('/tabla')}
            onSeePosiciones={() => router.push('/ranking')}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav />
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
    lastName?: string
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
    firstPlaces?: number
    secondPlaces?: number
    thirdPlaces?: number
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
  bottom2,
  leaderPoints,
  lastPoints,
  isCommission,
  tournamentNumber,
  activeGameDate,
  playersRemaining,
  lastElimination
}: HomeWithLiveGameProps) {
  const router = useRouter()
  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'

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
        {/* Celebrations - Birthdays (first position, dismissible) */}
        <CelebrationsCard />

        {/* Push opt-in - solo aparece si el usuario no tiene suscripción activa */}
        <PushActivationBanner />

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
            playerName={myRanking.playerName}
            onDetailClick={() => router.push(`/players/${user.id}`)}
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
              victories: p.firstPlaces ?? 0,
              podiums: (p.firstPlaces ?? 0) + (p.secondPlaces ?? 0) + (p.thirdPlaces ?? 0),
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
    </CPAppShell>
  )
}

export default HomePage
