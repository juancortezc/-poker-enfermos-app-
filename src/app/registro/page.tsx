'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Pause, Play, Smartphone, SmartphoneNfc, RotateCcw } from 'lucide-react'
import { calculatePointsForPosition } from '@/lib/tournament-utils'
import { buildAuthHeaders } from '@/lib/client-auth'
import { useTimerStateById } from '@/hooks/useTimerState'
import { useWakeLock } from '@/hooks/useWakeLock'
import { formatTime } from '@/lib/timer-utils'
import CPAppShell from '@/components/clean-poker/CPAppShell'
import CPHeader from '@/components/clean-poker/CPHeader'
import CPBottomNav from '@/components/clean-poker/CPBottomNav'

interface Player {
  id: string
  firstName: string
  lastName: string
}

interface Elimination {
  id: string
  position: number
  eliminatedPlayerId: string
  eliminatorPlayerId?: string | null
  points: number
  eliminatedPlayer: Player
  eliminatorPlayer?: Player | null
}

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
  playerIds: string[]
  tournament: {
    id: number
    name: string
    number: number
  }
  playersCount: number
}

export default function RegistroPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Estados
  const [activeGameDate, setActiveGameDate] = useState<GameDate | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [eliminations, setEliminations] = useState<Elimination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isControlling, setIsControlling] = useState(false)

  // Wake Lock para mantener pantalla activa
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, request: requestWakeLock, release: releaseWakeLock } = useWakeLock()

  // Solo cargar timer si la fecha ya está in_progress (evita 404 cuando status='CREATED')
  const timerGameDateId = activeGameDate?.status === 'in_progress'
    ? activeGameDate.id
    : null

  const {
    timerState,
    currentBlindLevel,
    formattedTimeRemaining,
    isActive: timerIsActive,
    isPaused: timerIsPaused,
    refresh: refreshTimer
  } = useTimerStateById(timerGameDateId)

  // Control de timer (pausar/reiniciar)
  const handlePauseTimer = async () => {
    if (!activeGameDate || isControlling) return
    setIsControlling(true)
    try {
      const response = await fetch(`/api/timer/game-date/${activeGameDate.id}/pause`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true })
      })
      if (response.ok) {
        await Promise.all([fetchAllData(), refreshTimer()])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al pausar timer')
      }
    } catch (error) {
      console.error('Error pausing timer:', error)
      setError('Error al pausar timer')
    } finally {
      setIsControlling(false)
    }
  }

  const handleResumeTimer = async () => {
    if (!activeGameDate || isControlling) return
    setIsControlling(true)
    try {
      const response = await fetch(`/api/timer/game-date/${activeGameDate.id}/resume`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true })
      })
      if (response.ok) {
        await Promise.all([fetchAllData(), refreshTimer()])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al reiniciar timer')
      }
    } catch (error) {
      console.error('Error resuming timer:', error)
      setError('Error al reiniciar timer')
    } finally {
      setIsControlling(false)
    }
  }

  const handleResetTimer = async () => {
    if (!activeGameDate || isControlling) return

    // Confirmación antes de resetear
    const confirmed = window.confirm(
      '¿Estás seguro de que quieres reiniciar el tiempo del nivel actual?\n\n' +
      'Esto restablecerá el tiempo completo del nivel pero mantendrá el progreso del juego.'
    )

    if (!confirmed) return

    setIsControlling(true)
    try {
      const response = await fetch(`/api/timer/game-date/${activeGameDate.id}/reset`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true })
      })
      if (response.ok) {
        await Promise.all([fetchAllData(), refreshTimer()])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al resetear timer')
      }
    } catch (error) {
      console.error('Error resetting timer:', error)
      setError('Error al resetear timer')
    } finally {
      setIsControlling(false)
    }
  }

  // Función para obtener todos los datos
  const handleStartGame = async () => {
    if (!activeGameDate) return

    try {
      const response = await fetch(`/api/game-dates/${activeGameDate.id}`, {
        method: 'PUT',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({ action: 'start' })
      })

      if (response.ok) {
        // Refresh data after starting
        await fetchAllData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al iniciar la fecha')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      setError('Error al iniciar la fecha')
    }
  }

  const fetchAllData = useCallback(async () => {
    if (!user) return // No hacer requests sin usuario

    try {
      setError(null)

      // Obtener fecha activa
      const gameDateResponse = await fetch('/api/game-dates/active')
      if (!gameDateResponse.ok) {
        throw new Error('No hay fecha activa')
      }

      const gameDateData = await gameDateResponse.json()
      if (!gameDateData) {
        throw new Error('No hay fecha activa en este momento')
      }

      setActiveGameDate(gameDateData)

      // Headers de autorización
      const authHeaders = buildAuthHeaders()

      // Obtener jugadores y eliminaciones en paralelo
      const [playersRes, eliminationsRes] = await Promise.all([
        fetch(`/api/game-dates/${gameDateData.id}/players`, { headers: authHeaders }),
        fetch(`/api/eliminations/game-date/${gameDateData.id}`, { headers: authHeaders })
      ])

      if (playersRes.ok) {
        const playersData = await playersRes.json()
        setPlayers(playersData)
      }

      if (eliminationsRes.ok) {
        const eliminationsData = await eliminationsRes.json()
        setEliminations(eliminationsData)
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Auto-refresh cada 5 segundos
  useEffect(() => {
    if (user) {
      fetchAllData()
      const interval = setInterval(fetchAllData, 5000)
      return () => clearInterval(interval)
    }
  }, [user, fetchAllData])

  // Verificación de permisos
  if (!user || user.role !== 'Comision') {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div
            className="p-6 text-center max-w-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: '4px',
            }}
          >
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--cp-on-surface)' }}
            >
              Acceso Denegado
            </p>
            <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
              No tienes permisos para acceder a esta página.
            </p>
          </div>
        </div>
      </CPAppShell>
    )
  }

  // Estados de carga y error
  if (loading) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-3">
              <div
                className="absolute inset-0 rounded-full border-4"
                style={{ borderColor: 'var(--cp-surface-border)' }}
              />
              <div
                className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: '#E53935', borderTopColor: 'transparent' }}
              />
            </div>
            <p style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando...</p>
          </div>
        </div>
      </CPAppShell>
    )
  }

  if (error || !activeGameDate) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div
            className="p-6 text-center max-w-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: '4px',
            }}
          >
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--cp-on-surface)' }}
            >
              No hay fecha activa
            </p>
            <p
              className="mb-4"
              style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}
            >
              {error || 'No existe una fecha de juego activa en este momento.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 transition-colors"
              style={{
                background: 'var(--cp-surface)',
                border: '1px solid var(--cp-surface-border)',
                borderRadius: '4px',
                color: 'var(--cp-on-surface)',
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </CPAppShell>
    )
  }

  // Cálculos para las estadísticas
  const totalPlayers = players.length
  const eliminatedPlayers = eliminations.length
  const activePlayers = totalPlayers - eliminatedPlayers
  const nextPosition = totalPlayers - eliminatedPlayers

  // Calcular puntos del ganador usando la función del sistema
  const winnerPoints = calculatePointsForPosition(1, totalPlayers)

  const displayBlind = currentBlindLevel
    ? {
        smallBlind: currentBlindLevel.smallBlind,
        bigBlind: currentBlindLevel.bigBlind
      }
    : undefined

  const timerSeconds = timerState?.timeRemaining ?? (currentBlindLevel ? currentBlindLevel.duration * 60 : 0)
  const fallbackFormatted = currentBlindLevel
    ? currentBlindLevel.duration === 0
      ? 'SIN LÍMITE'
      : formatTime(currentBlindLevel.duration * 60)
    : '--:--'
  const displayFormatted = timerState ? formattedTimeRemaining : fallbackFormatted
  const timerStatus = timerIsPaused
    ? 'paused'
    : timerIsActive
      ? 'active'
      : activeGameDate.status === 'in_progress'
        ? 'active'
        : 'inactive'

  // Determinar si el tiempo es crítico (< 1 minuto)
  const isCritical = timerSeconds > 0 && timerSeconds < 60

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : 'PE'

  return (
    <CPAppShell>
      <div className="min-h-screen pb-24">
        {/* CPHeader */}
        <CPHeader
          userInitials={userInitials}
          userPhotoUrl={user.photoUrl}
          tournamentNumber={activeGameDate.tournament.number}
          isComision={true}
          hasActiveGameDate={true}
        />

        <div className="max-w-lg mx-auto">
          {/* Page Title */}
          <p
            className="text-center py-2"
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Registro Fecha #{activeGameDate.dateNumber}
          </p>

          {/* Timer / Start Button */}
          <div className="px-4 space-y-3">
            {activeGameDate.status === 'CREATED' ? (
              <button
                onClick={handleStartGame}
                className="w-full px-4 py-2.5 font-semibold transition-colors"
                style={{
                  background: '#E53935',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: 'var(--cp-body-size)',
                }}
              >
                Iniciar Fecha
              </button>
            ) : (
              <>
                {/* Timer Display - CleanPoker Style */}
                <div
                  className={`p-4 transition-opacity duration-300 ${timerStatus === 'paused' ? 'opacity-70' : ''}`}
                  style={{
                    background: '#E53935',
                    borderRadius: '4px',
                    color: 'white',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-xl md:text-2xl font-bold font-mono tracking-wider ${isCritical ? 'animate-pulse' : ''}`}>
                      {timerStatus === 'paused' && '⏸ '}
                      {displayFormatted}
                    </div>
                    <div className="text-sm md:text-base font-semibold">
                      Blinds: {displayBlind ? `${displayBlind.smallBlind}/${displayBlind.bigBlind}` : 'Sin información'}
                    </div>
                  </div>
                </div>

                {/* Botones de control (solo para Comisión) */}
                {user && user.role === 'Comision' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {timerIsActive ? (
                        <button
                          onClick={handlePauseTimer}
                          disabled={isControlling}
                          className="px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{
                            background: '#ca8a04',
                            color: 'white',
                            borderRadius: '4px',
                          }}
                        >
                          <Pause className="w-4 h-4" />
                          PAUSAR
                        </button>
                      ) : timerIsPaused ? (
                        <button
                          onClick={handleResumeTimer}
                          disabled={isControlling}
                          className="px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            borderRadius: '4px',
                          }}
                        >
                          <Play className="w-4 h-4" />
                          REANUDAR
                        </button>
                      ) : null}

                      <button
                        onClick={() => router.push('/timer')}
                        className="px-4 py-3 font-semibold transition-colors"
                        style={{
                          background: 'var(--cp-surface)',
                          border: '1px solid var(--cp-surface-border)',
                          color: 'var(--cp-on-surface)',
                          borderRadius: '4px',
                        }}
                      >
                        VER TIMER
                      </button>
                    </div>

                    {/* Botón de reinicio de tiempo del nivel */}
                    <button
                      onClick={handleResetTimer}
                      disabled={isControlling}
                      className="w-full px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{
                        background: '#ea580c',
                        color: 'white',
                        borderRadius: '4px',
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      REINICIAR TIEMPO DEL NIVEL
                    </button>

                    {/* Wake Lock Toggle */}
                    {wakeLockSupported && (
                      <button
                        onClick={async () => {
                          if (wakeLockActive) {
                            await releaseWakeLock()
                          } else {
                            await requestWakeLock()
                          }
                        }}
                        className="w-full px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2"
                        style={{
                          background: wakeLockActive ? '#16a34a' : 'var(--cp-surface)',
                          border: wakeLockActive ? 'none' : '1px solid var(--cp-surface-border)',
                          color: wakeLockActive ? 'white' : 'var(--cp-on-surface)',
                          borderRadius: '4px',
                        }}
                      >
                        {wakeLockActive ? (
                          <>
                            <SmartphoneNfc className="w-4 h-4" />
                            PANTALLA ACTIVA
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4" />
                            MANTENER PANTALLA ACTIVA
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Stats Cards - CleanPoker Style */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Jugando', value: activePlayers, highlight: true },
                { label: 'Jugadores', value: totalPlayers, highlight: false },
                { label: 'Pts Max', value: winnerPoints, highlight: false },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 text-center"
                  style={{
                    background: 'var(--cp-surface)',
                    border: '1px solid var(--cp-surface-border)',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    className="text-sm mb-1"
                    style={{ color: 'var(--cp-on-surface-muted)' }}
                  >
                    {stat.label}
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: stat.highlight ? '#E53935' : 'var(--cp-on-surface)' }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Elimination Form - CleanPoker Style */}
            {activePlayers > 1 && (
              <CPEliminationForm
                gameDate={activeGameDate}
                tournamentId={activeGameDate.tournament.id}
                players={players}
                eliminations={eliminations}
                nextPosition={nextPosition}
                onEliminationCreated={fetchAllData}
              />
            )}

            {/* Game Completed Message */}
            {activePlayers <= 1 && (
              <div
                className="p-6 text-center"
                style={{
                  background: 'rgba(229, 57, 53, 0.1)',
                  border: '1px solid rgba(229, 57, 53, 0.3)',
                  borderRadius: '4px',
                }}
              >
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--cp-on-surface)' }}>
                  Juego Completado
                </h3>
                <p style={{ color: '#E53935' }}>
                  El torneo ha terminado. Felicitaciones al ganador!
                </p>
              </div>
            )}

            {/* Elimination History - CleanPoker Style */}
            <CPEliminationHistory
              eliminations={eliminations}
              players={players}
              tournamentId={activeGameDate.tournament.id}
              gameDateId={activeGameDate.id}
              onEliminationUpdated={fetchAllData}
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <CPBottomNav />
      </div>
    </CPAppShell>
  )
}

// ============================================
// CP ELIMINATION FORM COMPONENT
// ============================================
import { useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useSWRConfig } from 'swr'
import { swrKeys } from '@/lib/swr-config'

interface CPEliminationFormProps {
  gameDate: {
    id: number
    dateNumber: number
  }
  tournamentId: number
  players: Player[]
  eliminations: Elimination[]
  nextPosition: number
  onEliminationCreated: () => void
}

function CPEliminationForm({
  gameDate,
  tournamentId,
  players,
  eliminations,
  nextPosition,
  onEliminationCreated
}: CPEliminationFormProps) {
  const { notifyPlayerEliminated, notifyWinner } = useNotifications()
  const { mutate } = useSWRConfig()
  const [eliminatedPlayerId, setEliminatedPlayerId] = useState('')
  const [eliminatorPlayerId, setEliminatorPlayerId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Filtrar jugadores activos (no eliminados)
  const activePlayers = useMemo(() => {
    const eliminatedIds = eliminations.map(e => e.eliminatedPlayerId)
    return players.filter(player => !eliminatedIds.includes(player.id))
  }, [players, eliminations])

  // Calcular puntos para la posición actual
  const points = calculatePointsForPosition(nextPosition, players.length)

  // Identificar ganador automático cuando solo quedan dos jugadores
  const autoWinner = useMemo(() => {
    if (nextPosition !== 2 || !eliminatedPlayerId) return null
    return activePlayers.find(player => player.id !== eliminatedPlayerId) || null
  }, [nextPosition, eliminatedPlayerId, activePlayers])

  // Validar si el formulario está completo
  const isValid = Boolean(
    eliminatedPlayerId && (nextPosition === 2 ? autoWinner : eliminatorPlayerId)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      const eliminatorIdForRequest = nextPosition === 2
        ? autoWinner?.id || null
        : eliminatorPlayerId

      if (nextPosition === 2 && !eliminatorIdForRequest) {
        throw new Error('No se pudo identificar al ganador automáticamente')
      }

      const response = await fetch('/api/eliminations', {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          gameDateId: gameDate.id,
          position: nextPosition,
          eliminatedPlayerId,
          eliminatorPlayerId: eliminatorIdForRequest
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al registrar eliminación')
      }

      // Obtener información del jugador eliminado para notificaciones
      const eliminatedPlayer = players.find(p => p.id === eliminatedPlayerId)
      const eliminatorPlayer = nextPosition === 2
        ? autoWinner
        : eliminatorPlayerId
          ? players.find(p => p.id === eliminatorPlayerId)
          : null

      // Enviar notificaciones según el tipo de eliminación
      if (nextPosition === 1) {
        if (eliminatedPlayer) {
          notifyWinner(`${eliminatedPlayer.firstName} ${eliminatedPlayer.lastName}`, points)
        }
      } else if (nextPosition === 2 && eliminatorPlayer) {
        notifyWinner(`${eliminatorPlayer.firstName} ${eliminatorPlayer.lastName}`, calculatePointsForPosition(1, players.length))
      } else if (eliminatedPlayer) {
        notifyPlayerEliminated(`${eliminatedPlayer.firstName} ${eliminatedPlayer.lastName}`, nextPosition)
      }

      // Limpiar formulario
      setEliminatedPlayerId('')
      setEliminatorPlayerId('')

      // Notificar al componente padre
      onEliminationCreated()

      // Refrescar vistas públicas para reflejar el cambio
      mutate(swrKeys.activeGameDate())
      mutate(swrKeys.activeTournament())
      mutate(swrKeys.gameDateEliminations(gameDate.id))
      mutate(swrKeys.gameDate(gameDate.id))
      mutate(swrKeys.gameDates(tournamentId))
      mutate(swrKeys.tournamentRanking(tournamentId))

    } catch (err) {
      console.error('Error creating elimination:', err)
      setFormError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEliminatedPlayerId('')
    setEliminatorPlayerId('')
    setFormError(null)
  }

  return (
    <div
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
        borderRadius: '4px',
      }}
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--cp-on-surface)' }}>
            POS {nextPosition}
          </h3>
          <div className="font-bold text-lg" style={{ color: '#E53935' }}>
            PTS {points}
          </div>
        </div>

        {/* Error message */}
        {formError && (
          <div
            className="p-3"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
            }}
          >
            <p className="text-sm" style={{ color: '#ef4444' }}>{formError}</p>
          </div>
        )}

        {/* Campos del formulario */}
        <div className="grid grid-cols-2 gap-3">

          {/* Jugador Eliminado */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--cp-on-surface-muted)' }}
            >
              Jugador
            </label>
            <div className="relative">
              <select
                value={eliminatedPlayerId}
                onChange={(e) => setEliminatedPlayerId(e.target.value)}
                className="w-full px-3 py-2 text-sm appearance-none focus:outline-none"
                style={{
                  background: 'var(--cp-background)',
                  border: '1px solid var(--cp-surface-border)',
                  borderRadius: '4px',
                  color: 'var(--cp-on-surface)',
                }}
                required
              >
                <option value="">Seleccionar jugador...</option>
                {activePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none"
                style={{ color: 'var(--cp-on-surface-muted)' }}
              />
            </div>
          </div>

          {/* Jugador Eliminador */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--cp-on-surface-muted)' }}
            >
              {nextPosition === 2 ? 'Ganador' : 'vs'}
            </label>
            <div className="relative">
              {nextPosition === 2 ? (
                <div
                  className="w-full px-3 py-2 text-sm"
                  style={{
                    background: 'var(--cp-background)',
                    border: '1px solid var(--cp-surface-border)',
                    borderRadius: '4px',
                    color: 'var(--cp-on-surface)',
                    opacity: 0.8,
                  }}
                >
                  {autoWinner
                    ? `${autoWinner.firstName} ${autoWinner.lastName}`
                    : 'Selecciona primero al jugador eliminado'}
                </div>
              ) : (
                <>
                  <select
                    value={eliminatorPlayerId}
                    onChange={(e) => setEliminatorPlayerId(e.target.value)}
                    className="w-full px-3 py-2 text-sm appearance-none focus:outline-none"
                    style={{
                      background: 'var(--cp-background)',
                      border: '1px solid var(--cp-surface-border)',
                      borderRadius: '4px',
                      color: 'var(--cp-on-surface)',
                    }}
                    required={nextPosition !== 2}
                  >
                    <option value="">Seleccionar eliminador...</option>
                    {activePlayers
                      .filter(player => player.id !== eliminatedPlayerId)
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none"
                    style={{ color: 'var(--cp-on-surface-muted)' }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 transition-colors"
              style={{ color: 'var(--cp-on-surface-muted)' }}
              disabled={isSubmitting}
            >
              Limpiar
            </button>

            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="px-6 py-2 flex items-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: '#E53935',
                color: 'white',
                borderRadius: '4px',
              }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
              ) : (
                <Plus className="w-5 h-5 mr-2" />
              )}
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </div>

        {/* Información especial para posición 2 */}
        {nextPosition === 2 && (
          <div
            className="p-3"
            style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '4px',
            }}
          >
            <p className="text-sm" style={{ color: '#eab308' }}>
              Al registrar la posición 2, se declarará automáticamente el ganador.
            </p>
          </div>
        )}

      </form>
    </div>
  )
}

// ============================================
// CP ELIMINATION HISTORY COMPONENT
// ============================================
import { Edit2, Check, X } from 'lucide-react'

interface CPEliminationHistoryProps {
  eliminations: Elimination[]
  players: Player[]
  tournamentId: number
  gameDateId: number
  onEliminationUpdated: () => void
}

function CPEliminationHistory({
  eliminations,
  players,
  tournamentId,
  gameDateId,
  onEliminationUpdated
}: CPEliminationHistoryProps) {
  const { mutate } = useSWRConfig()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    eliminatedPlayerId: '',
    eliminatorPlayerId: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  if (eliminations.length === 0) {
    return null
  }

  const handleStartEdit = (elimination: Elimination) => {
    setEditingId(elimination.id)
    setEditForm({
      eliminatedPlayerId: elimination.eliminatedPlayerId,
      eliminatorPlayerId: elimination.eliminatorPlayerId || ''
    })
    setUpdateError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ eliminatedPlayerId: '', eliminatorPlayerId: '' })
    setUpdateError(null)
  }

  const handleSaveEdit = async (eliminationId: string) => {
    if (!editForm.eliminatedPlayerId) return
    if (editForm.eliminatorPlayerId && editForm.eliminatorPlayerId === editForm.eliminatedPlayerId) {
      setUpdateError('El eliminador no puede ser el mismo jugador eliminado')
      return
    }

    setIsUpdating(true)
    setUpdateError(null)
    try {
      const response = await fetch(`/api/eliminations/${eliminationId}`, {
        method: 'PUT',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          eliminatedPlayerId: editForm.eliminatedPlayerId,
          eliminatorPlayerId: editForm.eliminatorPlayerId || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar eliminación')
      }

      handleCancelEdit()
      onEliminationUpdated()
      mutate(swrKeys.activeGameDate())
      mutate(swrKeys.activeTournament())
      mutate(swrKeys.gameDateEliminations(gameDateId))
      mutate(swrKeys.gameDate(gameDateId))
      mutate(swrKeys.gameDates(tournamentId))
      mutate(swrKeys.tournamentRanking(tournamentId))

    } catch (error) {
      console.error('Error updating elimination:', error)
      setUpdateError(error instanceof Error ? error.message : 'Error desconocido al actualizar')
    } finally {
      setIsUpdating(false)
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.firstName} ${player.lastName}` : 'Desconocido'
  }

  // Ordenar eliminaciones por posición ascendente (más recientes primero - posiciones más bajas)
  const sortedEliminations = [...eliminations].sort((a, b) => a.position - b.position)

  return (
    <div
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
        borderRadius: '4px',
      }}
    >
      <div className="p-4">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--cp-on-surface)' }}>
          Eliminaciones
        </h3>

        {updateError && (
          <div
            className="mb-3 p-3"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
            }}
          >
            <p className="text-sm" style={{ color: '#ef4444' }}>{updateError}</p>
          </div>
        )}

        <div className="space-y-2">
          {sortedEliminations.map((elimination) => (
            <div
              key={elimination.id}
              className="flex items-center justify-between py-3 px-2 transition-colors"
              style={{
                borderRadius: '4px',
              }}
            >
              {editingId === elimination.id ? (
                // Modo edición
                <div className="flex items-center space-x-2 flex-1">
                  <div className="w-6 text-center">
                    <span className="font-bold text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                      {elimination.position}
                    </span>
                  </div>

                  {/* Eliminado */}
                  <div className="flex-1">
                    <select
                      value={editForm.eliminatedPlayerId}
                      onChange={(e) => setEditForm({...editForm, eliminatedPlayerId: e.target.value})}
                      className="w-full px-2 py-1 text-xs"
                      style={{
                        background: 'var(--cp-background)',
                        border: '1px solid var(--cp-surface-border)',
                        borderRadius: '4px',
                        color: 'var(--cp-on-surface)',
                      }}
                      disabled={isUpdating}
                    >
                      <option value="">Jugador...</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Eliminador */}
                  <div className="flex-1">
                    {elimination.position === 1 ? (
                      <span className="text-xs" style={{ color: 'var(--cp-on-surface-muted)' }}>
                        Ganador
                      </span>
                    ) : (
                      <select
                        value={editForm.eliminatorPlayerId}
                        onChange={(e) => setEditForm({...editForm, eliminatorPlayerId: e.target.value})}
                        className="w-full px-2 py-1 text-xs"
                        style={{
                          background: 'var(--cp-background)',
                          border: '1px solid var(--cp-surface-border)',
                          borderRadius: '4px',
                          color: 'var(--cp-on-surface)',
                        }}
                        disabled={isUpdating}
                      >
                        <option value="">vs...</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.firstName} {player.lastName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="w-8 text-center">
                    <span className="font-semibold text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                      {elimination.points}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSaveEdit(elimination.id)}
                      disabled={isUpdating || !editForm.eliminatedPlayerId}
                      className="p-1 transition-colors disabled:opacity-50"
                      style={{ color: '#E53935' }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="p-1 transition-colors"
                      style={{ color: 'var(--cp-on-surface-muted)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <>
                  <div className="flex items-center space-x-2 flex-1">
                    <div className="w-6 text-center">
                      <span className="font-bold text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                        {elimination.position}
                      </span>
                    </div>
                    <div className="flex-1 text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                      <span className="truncate block">
                        {getPlayerName(elimination.eliminatedPlayerId)}
                        {elimination.position !== 1 && (
                          <span style={{ color: 'var(--cp-on-surface-muted)' }}>
                            {' vs '}
                            {elimination.eliminatorPlayer ?
                              getPlayerName(elimination.eliminatorPlayerId!) :
                              'N/A'
                            }
                          </span>
                        )}
                        {elimination.position === 1 && (
                          <span style={{ color: 'var(--cp-on-surface-muted)' }}> - Ganador</span>
                        )}
                      </span>
                    </div>
                    <div className="w-8 text-center">
                      <span className="font-semibold text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                        {elimination.points}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartEdit(elimination)}
                    className="p-2 transition-colors"
                    style={{ color: 'var(--cp-on-surface-muted)' }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
