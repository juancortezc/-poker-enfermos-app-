'use client'

import { useState, useEffect } from 'react'
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
import { CPPageSkeleton } from './CPPageSkeleton'
import { LiveDateBoard } from './LiveDateBoard'
import { CelebrationsCard } from './CelebrationsCard'
import { PushActivationBanner } from './PushActivationBanner'
import { ClaveDebilBanner } from './ClaveDebilBanner'
import { HomeViewToggle, type HomeView } from './HomeViewToggle'
import { HomeUltimaFecha } from './HomeUltimaFecha'
import { HomeTorneo } from './HomeTorneo'
import { openAddToCalendar } from '@/lib/home-view'
import type { PlayerRanking, TournamentInsightsData } from '@poker/shared'
import { isValidPinForLogin } from '@poker/shared'

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

export function HomePage() {
  const { user, loading: authLoading } = useAuth()

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
    progress,
    nextDate: nextGameDateFromTournament,
    lastCompletedDate,
    isFinished
  } = useActiveTournament({ refreshInterval: 300000 }) // 5 minutes

  const {
    ranking: rankingData,
    isLoading: rankingLoading
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

  /*
   * Mientras se juega una fecha, el home es el tablero en vivo (estado C). Con
   * esto el participante puede salir al home de siempre — Última Fecha y
   * Torneo — y volver al tablero sin perderlo: es un cambio de vista, no una
   * navegación, así que el SWR del tablero sigue caliente y volver es
   * instantáneo. Arranca en el tablero porque es lo que importa en la mesa.
   */

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
        nextLabel={isFinished ? 'Proximo Torneo' : 'Proxima Fecha'}
        nextDate={isFinished ? 'Por anunciar' : formatNextDateSimple(nextGameDateFromTournament?.dateNumber, nextGameDateFromTournament?.scheduledDate ?? null)}
        tournamentNumber={activeTournament?.number ?? 29}
      />
    )
  }

  const rankings = rankingData?.rankings || []
  const isCommission = user.role === 'Comision'
  const isGameLive = activeGameDate?.status === 'in_progress'

  // Estado C: Fecha en vivo. Mientras se juega, el home ES el tablero y no hay
  // salida propia: la navegacion de abajo ya lleva a la Tabla y al resto.
  if (isGameLive && activeGameDate) {
    return (
      <HomeWithLiveGame
        user={user}
        isCommission={isCommission}
        tournamentNumber={activeTournament?.number ?? 29}
        activeGameDate={activeGameDate}
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
      finished={isFinished}
      totalDates={progress?.total}
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
  return <CPPageSkeleton blocks={[44, 120, 150, 220, 180]} />
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
  nextLabel: string
  tournamentNumber: number
}

function HomeNotAuthenticated({ leader, nextDate, nextLabel, tournamentNumber }: HomeNotAuthenticatedProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  // Si llegaste aqui porque tu clave dejo de servir, decirtelo. Sin esto la
  // vuelta al login parece un cierre de sesion porque si, y nadie adivina que
  // la clave cambio en otro lado.
  const [caducada, setCaducada] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('poker-sesion-caducada')) {
      sessionStorage.removeItem('poker-sesion-caducada')
      setCaducada(true)
    }
  }, [])

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
    setPin(value)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidPinForLogin(pin)) return

    setLoading(true)
    setError('')

    const success = await login(pin)

    if (!success) {
      setError('Clave incorrecta')
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
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={12}
            placeholder="Ingresa tu clave"
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
            disabled={loading || !isValidPinForLogin(pin)}
            className="w-full flex items-center justify-center gap-2 touch-manipulation"
            style={{
              backgroundColor: isValidPinForLogin(pin) ? '#E53935' : '#444444',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              marginTop: '16px',
              minHeight: '56px',
              opacity: loading || !isValidPinForLogin(pin) ? 0.5 : 1,
              cursor: loading || !isValidPinForLogin(pin) ? 'not-allowed' : 'pointer',
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
            <p className="text-center mt-3" style={{ color: '#FF6B6B', fontSize: '13px' }}>
              {error}
            </p>
          )}

          {!error && caducada && (
            <p className="text-center mt-3" style={{ color: '#E0B66C', fontSize: '13px' }}>
              Tu clave cambio. Volve a entrar con la nueva.
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
            {nextLabel}
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
  finished: boolean
  totalDates?: number
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
  finished,
  totalDates,
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

  /*
   * Ultima Fecha es SIEMPRE la vista de entrada, mientras haya una fecha
   * jugada. Antes la decidia una ventana de tiempo (isWithinRecapWindow): el
   * recap se mostraba solo unas horas despues de la fecha y luego la home
   * cambiaba sola a Torneo. Eso hacia que la misma pantalla te recibiera
   * distinto segun el dia, sin que hubieras tocado nada.
   * El unico caso que cae en Torneo es el arranque del torneo, cuando todavia
   * no hay fecha jugada — ahi el toggle de Ultima Fecha va deshabilitado.
   */
  const defaultView: HomeView = lastCompletedDate ? 'ultimaFecha' : 'torneo'
  const [view, setView] = useState<HomeView>(defaultView)

  return (
    <CPAppShell tone="light">
      {/* Header */}
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isCommission}
        hasActiveGameDate={hasActiveDate}
        tone="light"
      />

      {/* Content */}
      <main className="pb-24 px-5 pt-5 space-y-5">
        {/* Celebrations - Birthdays (first position, dismissible) */}
        <CelebrationsCard />

        {/* Aviso de clave vieja - solo si la suya no cumple la regla actual */}
        <ClaveDebilBanner />

        {/* Push opt-in - solo aparece si el usuario no tiene suscripción activa */}
        <PushActivationBanner />

        <HomeViewToggle value={view} onChange={setView} ultimaFechaDisabled={!lastCompletedDate} />

        {view === 'ultimaFecha' && lastCompletedDate ? (
          <HomeUltimaFecha
            rankings={rankings}
            lastCompletedDate={lastCompletedDate}
            onSeeAllResults={() => router.push('/fecha')}
            onSeeResultsTab={() => router.push('/fecha?tab=eliminaciones')}
          />
        ) : (
          <HomeTorneo
            user={user}
            tournamentId={tournamentId}
            tournamentNumber={tournamentNumber}
            finished={finished}
            lastDateNumber={lastCompletedDate?.dateNumber}
            totalDates={totalDates}
            rankings={rankings}
            nextDate={nextDate}
            seasonHighlights={insights?.seasonHighlights}
            onOpenProfile={() => router.push(`/players/${user.id}`)}
            onOpenCalendarPage={() => router.push('/calendario')}
            onAddToPersonalCalendar={() => openAddToCalendar(nextDate?.dateNumber, nextDate?.scheduledDate)}
            onSeeTabla={() => router.push('/ranking')}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav tone="light" />
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
  isCommission: boolean
  tournamentNumber: number
  activeGameDate: ActiveGameDate
}

function HomeWithLiveGame({
  user,
  isCommission,
  tournamentNumber,
  activeGameDate,
}: HomeWithLiveGameProps) {
  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'

  return (
    /*
     * OSCURO A PROPOSITO. Mientras se juega, el home es el tablero de la mesa:
     * se mira de noche, en la mesa, junto al timer. Ahi el fondo oscuro tiene
     * razon de ser — es el unico contexto donde la vuelve mas comoda, no mas
     * sombria. El resto de la app va en claro; esto no.
     */
    <CPAppShell tone="dark">
      {/* Header */}
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isCommission}
        hasActiveGameDate={true}
        tone="dark"
      />

      {/*
        Durante la fecha en vivo el home es solo el tablero. Las tarjetas del
        torneo vuelven cuando la fecha termina. No hay boton de salida: toda la
        altura que sobra es para la tabla, que es lo que se mira en la mesa, y
        la navegacion de abajo ya lleva a la Tabla, las Estadisticas y el resto.
      */}
      <main className="pb-20 px-3 pt-2">
        <LiveDateBoard gameDateId={activeGameDate.id} userId={user.id} />
      </main>

      {/* Bottom Nav */}
      <CPBottomNav tone="dark" />
    </CPAppShell>
  )
}

export default HomePage
