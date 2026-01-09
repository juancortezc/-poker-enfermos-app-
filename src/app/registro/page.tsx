'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Pause, Play, Smartphone, SmartphoneNfc, RotateCcw, FastForward } from 'lucide-react'
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
    nextBlindLevel,
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

  const handleLevelUp = async () => {
    if (!activeGameDate || isControlling || !timerState || !nextBlindLevel) return

    const nextLevel = timerState.currentLevel + 1

    // Confirmación antes de avanzar
    const confirmed = window.confirm(
      `¿Avanzar al siguiente nivel de blinds?\n\n` +
      `Nivel actual: ${timerState.currentLevel} (${currentBlindLevel?.smallBlind}/${currentBlindLevel?.bigBlind})\n` +
      `Siguiente nivel: ${nextLevel} (${nextBlindLevel.smallBlind}/${nextBlindLevel.bigBlind})\n\n` +
      `El timer se reiniciará con el tiempo del nuevo nivel.`
    )

    if (!confirmed) return

    setIsControlling(true)
    try {
      const response = await fetch(`/api/timer/game-date/${activeGameDate.id}/level-up`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({ toLevel: nextLevel })
      })
      if (response.ok) {
        await Promise.all([fetchAllData(), refreshTimer()])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al avanzar nivel')
      }
    } catch (error) {
      console.error('Error advancing level:', error)
      setError('Error al avanzar nivel')
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
                {/* Timer Controls - Compact Row */}
                <div
                  className="flex items-center justify-between p-3"
                  style={{
                    background: 'var(--cp-surface)',
                    border: '1px solid var(--cp-surface-border)',
                    borderRadius: '4px',
                  }}
                >
                  {/* Blinds */}
                  <div className="text-center">
                    <p className="text-xs" style={{ color: 'var(--cp-on-surface-muted)' }}>Blinds</p>
                    <p className="font-bold" style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}>
                      {displayBlind ? `${displayBlind.smallBlind}/${displayBlind.bigBlind}` : '--'}
                    </p>
                  </div>

                  {/* Timer */}
                  <div
                    className={`text-center px-4 py-1.5 rounded ${isCritical ? 'animate-pulse' : ''}`}
                    style={{
                      background: timerStatus === 'paused' ? 'rgba(202, 138, 4, 0.2)' : 'rgba(229, 57, 53, 0.15)',
                    }}
                  >
                    <p className="text-xs" style={{ color: 'var(--cp-on-surface-muted)' }}>Tiempo</p>
                    <p
                      className="font-bold font-mono"
                      style={{
                        color: timerStatus === 'paused' ? '#ca8a04' : '#E53935',
                        fontSize: 'var(--cp-title-size)',
                      }}
                    >
                      {displayFormatted}
                    </p>
                  </div>

                  {/* Control Icons - Only for Comision */}
                  {user && user.role === 'Comision' && (
                    <div className="flex items-center gap-2">
                      {/* Pause/Play */}
                      {timerIsActive ? (
                        <button
                          onClick={handlePauseTimer}
                          disabled={isControlling}
                          className="w-9 h-9 flex items-center justify-center rounded transition-colors disabled:opacity-50"
                          style={{ background: '#ca8a04', color: 'white' }}
                          title="Pausar"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : timerIsPaused ? (
                        <button
                          onClick={handleResumeTimer}
                          disabled={isControlling}
                          className="w-9 h-9 flex items-center justify-center rounded transition-colors disabled:opacity-50"
                          style={{ background: '#16a34a', color: 'white' }}
                          title="Reanudar"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      ) : null}

                      {/* Reset */}
                      <button
                        onClick={handleResetTimer}
                        disabled={isControlling}
                        className="w-9 h-9 flex items-center justify-center rounded transition-colors disabled:opacity-50"
                        style={{
                          background: 'var(--cp-surface-solid)',
                          border: '1px solid var(--cp-surface-border)',
                          color: 'var(--cp-on-surface)',
                        }}
                        title="Reiniciar nivel"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Level Up / Fast Forward */}
                      {nextBlindLevel && (
                        <button
                          onClick={handleLevelUp}
                          disabled={isControlling}
                          className="w-9 h-9 flex items-center justify-center rounded transition-colors disabled:opacity-50"
                          style={{
                            background: '#E53935',
                            color: 'white',
                          }}
                          title={`Avanzar a nivel ${(timerState?.currentLevel ?? 0) + 1} (${nextBlindLevel.smallBlind}/${nextBlindLevel.bigBlind})`}
                        >
                          <FastForward className="w-4 h-4" />
                        </button>
                      )}

                      {/* Wake Lock */}
                      {wakeLockSupported && (
                        <button
                          onClick={async () => {
                            if (wakeLockActive) {
                              await releaseWakeLock()
                            } else {
                              await requestWakeLock()
                            }
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded transition-colors"
                          style={{
                            background: wakeLockActive ? '#16a34a' : 'var(--cp-surface-solid)',
                            border: wakeLockActive ? 'none' : '1px solid var(--cp-surface-border)',
                            color: wakeLockActive ? 'white' : 'var(--cp-on-surface)',
                          }}
                          title={wakeLockActive ? 'Pantalla activa' : 'Mantener pantalla activa'}
                        >
                          {wakeLockActive ? (
                            <SmartphoneNfc className="w-4 h-4" />
                          ) : (
                            <Smartphone className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Stats Cards - CleanPoker Style */}
            <CPStatsCards
              activePlayers={activePlayers}
              totalPlayers={totalPlayers}
              winnerPoints={winnerPoints}
              isComision={user?.role === 'Comision'}
              players={players}
              eliminations={eliminations}
              gameDateId={activeGameDate.id}
              tournamentId={activeGameDate.tournament.id}
              onPlayersChanged={fetchAllData}
            />

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

  // Helper to get player name - prefer elimination data, fallback to players array
  const getPlayerName = (elimination: Elimination, type: 'eliminated' | 'eliminator') => {
    if (type === 'eliminated') {
      // Use data from elimination object first (comes from API)
      if (elimination.eliminatedPlayer) {
        return `${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`
      }
      // Fallback to players array
      const player = players.find(p => p.id === elimination.eliminatedPlayerId)
      return player ? `${player.firstName} ${player.lastName}` : 'Desconocido'
    } else {
      // Use data from elimination object first
      if (elimination.eliminatorPlayer) {
        return `${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}`
      }
      // Fallback to players array
      if (!elimination.eliminatorPlayerId) return 'N/A'
      const player = players.find(p => p.id === elimination.eliminatorPlayerId)
      return player ? `${player.firstName} ${player.lastName}` : 'Desconocido'
    }
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
                        {getPlayerName(elimination, 'eliminated')}
                        {elimination.position !== 1 && (
                          <span style={{ color: 'var(--cp-on-surface-muted)' }}>
                            {' vs '}
                            {getPlayerName(elimination, 'eliminator')}
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

// ============================================
// CP STATS CARDS COMPONENT (with players modal)
// ============================================
import { Users, UserMinus, UserPlus, AlertTriangle, X as XIcon, Settings } from 'lucide-react'

interface CPStatsCardsProps {
  activePlayers: number
  totalPlayers: number
  winnerPoints: number
  isComision: boolean
  players: Player[]
  eliminations: Elimination[]
  gameDateId: number
  tournamentId: number
  onPlayersChanged: () => void
}

function CPStatsCards({
  activePlayers,
  totalPlayers,
  winnerPoints,
  isComision,
  players,
  eliminations,
  gameDateId,
  tournamentId,
  onPlayersChanged
}: CPStatsCardsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {/* Jugando */}
        <div
          className="p-4 text-center"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
          }}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--cp-on-surface-muted)' }}>
            Jugando
          </div>
          <div className="text-2xl font-bold" style={{ color: '#E53935' }}>
            {activePlayers}
          </div>
        </div>

        {/* Jugadores - Clickable for Comision */}
        <button
          onClick={() => isComision && setIsModalOpen(true)}
          disabled={!isComision}
          className={`p-4 text-center relative ${isComision ? 'cursor-pointer hover:ring-1 hover:ring-white/20' : ''}`}
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
          }}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--cp-on-surface-muted)' }}>
            Jugadores
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--cp-on-surface)' }}>
            {totalPlayers}
          </div>
          {isComision && (
            <Settings
              size={12}
              className="absolute top-2 right-2"
              style={{ color: 'var(--cp-on-surface-muted)' }}
            />
          )}
        </button>

        {/* Pts Max */}
        <div
          className="p-4 text-center"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
          }}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--cp-on-surface-muted)' }}>
            Pts Max
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--cp-on-surface)' }}>
            {winnerPoints}
          </div>
        </div>
      </div>

      {/* Modal de gestión de participantes */}
      {isModalOpen && (
        <CPPlayersModal
          players={players}
          eliminations={eliminations}
          gameDateId={gameDateId}
          tournamentId={tournamentId}
          onPlayersChanged={onPlayersChanged}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}

// ============================================
// CP PLAYERS MODAL (add/remove with double confirmation)
// ============================================
interface CPPlayersModalProps {
  players: Player[]
  eliminations: Elimination[]
  gameDateId: number
  tournamentId: number
  onPlayersChanged: () => void
  onClose: () => void
}

function CPPlayersModal({
  players,
  eliminations,
  gameDateId,
  tournamentId,
  onPlayersChanged,
  onClose
}: CPPlayersModalProps) {
  const { mutate } = useSWRConfig()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1)
  const [actionType, setActionType] = useState<'add' | 'remove' | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loadingAllPlayers, setLoadingAllPlayers] = useState(true)

  // Cargar todos los jugadores del sistema para poder agregar
  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        const response = await fetch('/api/players', {
          headers: buildAuthHeaders()
        })
        if (response.ok) {
          const data = await response.json()
          setAllPlayers(data)
        }
      } catch (err) {
        console.error('Error fetching all players:', err)
      } finally {
        setLoadingAllPlayers(false)
      }
    }
    fetchAllPlayers()
  }, [])

  // Jugadores activos (no eliminados) en la fecha
  const activePlayersInDate = useMemo(() => {
    const eliminatedIds = eliminations.map(e => e.eliminatedPlayerId)
    return players.filter(player => !eliminatedIds.includes(player.id))
  }, [players, eliminations])

  // Jugadores eliminados en la fecha
  const eliminatedPlayersInDate = useMemo(() => {
    const eliminatedIds = eliminations.map(e => e.eliminatedPlayerId)
    return players.filter(player => eliminatedIds.includes(player.id))
  }, [players, eliminations])

  // Jugadores disponibles para agregar (no están en la fecha)
  const availableToAdd = useMemo(() => {
    const registeredIds = players.map(p => p.id)
    return allPlayers.filter(p => !registeredIds.includes(p.id))
  }, [allPlayers, players])

  const handleSelectForRemove = (playerId: string) => {
    setSelectedPlayerId(playerId)
    setActionType('remove')
    setConfirmationStep(1)
    setError(null)
  }

  const handleSelectForAdd = (playerId: string) => {
    setSelectedPlayerId(playerId)
    setActionType('add')
    setConfirmationStep(1)
    setError(null)
  }

  const handleFirstConfirm = () => {
    setConfirmationStep(2)
  }

  const handleCancelConfirm = () => {
    setSelectedPlayerId(null)
    setActionType(null)
    setConfirmationStep(1)
    setError(null)
  }

  const refreshCaches = () => {
    mutate(swrKeys.activeGameDate())
    mutate(swrKeys.activeTournament())
    mutate(swrKeys.gameDateEliminations(gameDateId))
    mutate(swrKeys.gameDate(gameDateId))
    mutate(swrKeys.gameDates(tournamentId))
    mutate(swrKeys.tournamentRanking(tournamentId))
  }

  const handleAddPlayer = async () => {
    if (!selectedPlayerId) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/game-dates/${gameDateId}/players`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({ playerId: selectedPlayerId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al agregar participante')
      }

      setSelectedPlayerId(null)
      setActionType(null)
      setConfirmationStep(1)
      onPlayersChanged()
      refreshCaches()

    } catch (err) {
      console.error('Error adding player:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemovePlayer = async () => {
    if (!selectedPlayerId) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/game-dates/${gameDateId}/players`, {
        method: 'DELETE',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({ playerId: selectedPlayerId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al remover participante')
      }

      setSelectedPlayerId(null)
      setActionType(null)
      setConfirmationStep(1)
      onPlayersChanged()
      refreshCaches()

    } catch (err) {
      console.error('Error removing player:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmAction = () => {
    if (actionType === 'add') {
      handleAddPlayer()
    } else if (actionType === 'remove') {
      handleRemovePlayer()
    }
  }

  const getPlayerName = (player: Player) => `${player.firstName} ${player.lastName}`
  const selectedPlayer = actionType === 'add'
    ? allPlayers.find(p => p.id === selectedPlayerId)
    : players.find(p => p.id === selectedPlayerId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose()
      }}
    >
      <div
        className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          background: 'var(--cp-background)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--cp-surface-border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--cp-on-surface)' }}>
            Gestionar Jugadores
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 transition-colors"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div
              className="p-3"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
              }}
            >
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          {/* Confirmation panel */}
          {selectedPlayerId && selectedPlayer && actionType && (
            <div
              className="p-4"
              style={{
                background: actionType === 'add' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                border: `1px solid ${actionType === 'add' ? 'rgba(22, 163, 74, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                borderRadius: '4px',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                {actionType === 'add' ? (
                  <UserPlus size={20} style={{ color: '#16a34a' }} />
                ) : (
                  <AlertTriangle size={20} style={{ color: '#f97316' }} />
                )}
                <span className="font-semibold" style={{ color: actionType === 'add' ? '#16a34a' : '#f97316' }}>
                  {confirmationStep === 1
                    ? (actionType === 'add' ? 'Confirmar agregar' : 'Confirmar quitar')
                    : 'Confirmación final'}
                </span>
              </div>

              <p className="text-sm mb-3" style={{ color: 'var(--cp-on-surface)' }}>
                {confirmationStep === 1 ? (
                  actionType === 'add' ? (
                    <>¿Agregar a <strong>{getPlayerName(selectedPlayer)}</strong> a esta fecha?</>
                  ) : (
                    <>¿Quitar a <strong>{getPlayerName(selectedPlayer)}</strong> de esta fecha?</>
                  )
                ) : (
                  <>Se recalcularán todas las posiciones y puntos. ¿Confirmas?</>
                )}
              </p>

              <div className="flex gap-2">
                {confirmationStep === 1 ? (
                  <>
                    <button
                      onClick={handleFirstConfirm}
                      className="flex-1 px-4 py-2 text-sm font-semibold transition-colors"
                      style={{
                        background: actionType === 'add' ? '#16a34a' : '#f97316',
                        color: 'white',
                        borderRadius: '4px',
                      }}
                    >
                      Sí, continuar
                    </button>
                    <button
                      onClick={handleCancelConfirm}
                      className="flex-1 px-4 py-2 text-sm transition-colors"
                      style={{
                        background: 'var(--cp-surface)',
                        border: '1px solid var(--cp-surface-border)',
                        color: 'var(--cp-on-surface)',
                        borderRadius: '4px',
                      }}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleConfirmAction}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                      style={{
                        background: actionType === 'add' ? '#16a34a' : '#E53935',
                        color: 'white',
                        borderRadius: '4px',
                      }}
                    >
                      {isProcessing ? 'Procesando...' : 'Confirmar'}
                    </button>
                    <button
                      onClick={handleCancelConfirm}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 text-sm transition-colors"
                      style={{
                        background: 'var(--cp-surface)',
                        border: '1px solid var(--cp-surface-border)',
                        color: 'var(--cp-on-surface)',
                        borderRadius: '4px',
                      }}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Jugadores en la fecha - Activos */}
          {activePlayersInDate.length > 0 && (
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: 'var(--cp-on-surface-muted)' }}>
                En juego ({activePlayersInDate.length})
              </p>
              <div className="space-y-1">
                {activePlayersInDate.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between py-2 px-3 transition-colors ${
                      selectedPlayerId === player.id && actionType === 'remove' ? 'ring-1 ring-orange-500' : ''
                    }`}
                    style={{
                      background: selectedPlayerId === player.id && actionType === 'remove' ? 'rgba(249, 115, 22, 0.1)' : 'var(--cp-surface)',
                      borderRadius: '4px',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: '#16a34a' }} />
                      <span className="text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                        {getPlayerName(player)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSelectForRemove(player.id)}
                      disabled={isProcessing}
                      className="p-1.5 transition-colors hover:bg-white/10 disabled:opacity-50"
                      style={{ color: 'var(--cp-on-surface-muted)', borderRadius: '4px' }}
                      title="Quitar de la fecha"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jugadores eliminados */}
          {eliminatedPlayersInDate.length > 0 && (
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: 'var(--cp-on-surface-muted)' }}>
                Eliminados ({eliminatedPlayersInDate.length})
              </p>
              <div className="space-y-1">
                {eliminatedPlayersInDate.map((player) => {
                  const elimination = eliminations.find(e => e.eliminatedPlayerId === player.id)
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between py-2 px-3 transition-colors ${
                        selectedPlayerId === player.id && actionType === 'remove' ? 'ring-1 ring-orange-500' : ''
                      }`}
                      style={{
                        background: selectedPlayerId === player.id && actionType === 'remove' ? 'rgba(249, 115, 22, 0.1)' : 'var(--cp-surface)',
                        borderRadius: '4px',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cp-on-surface-muted)' }} />
                        <span className="text-sm" style={{ color: 'var(--cp-on-surface-muted)' }}>
                          {getPlayerName(player)}
                        </span>
                        {elimination && (
                          <span className="text-xs" style={{ color: 'var(--cp-on-surface-muted)' }}>
                            (Pos {elimination.position})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectForRemove(player.id)}
                        disabled={isProcessing}
                        className="p-1.5 transition-colors hover:bg-white/10 disabled:opacity-50"
                        style={{ color: 'var(--cp-on-surface-muted)', borderRadius: '4px' }}
                        title="Quitar de la fecha"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Agregar jugadores */}
          {availableToAdd.length > 0 && (
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: 'var(--cp-on-surface-muted)' }}>
                Disponibles para agregar ({availableToAdd.length})
              </p>
              {loadingAllPlayers ? (
                <p className="text-xs" style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando...</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableToAdd.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between py-2 px-3 transition-colors ${
                        selectedPlayerId === player.id && actionType === 'add' ? 'ring-1 ring-green-500' : ''
                      }`}
                      style={{
                        background: selectedPlayerId === player.id && actionType === 'add' ? 'rgba(22, 163, 74, 0.1)' : 'var(--cp-surface)',
                        borderRadius: '4px',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cp-surface-border)' }} />
                        <span className="text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                          {getPlayerName(player)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSelectForAdd(player.id)}
                        disabled={isProcessing}
                        className="p-1.5 transition-colors hover:bg-white/10 disabled:opacity-50"
                        style={{ color: '#16a34a', borderRadius: '4px' }}
                        title="Agregar a la fecha"
                      >
                        <UserPlus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4" style={{ borderTop: '1px solid var(--cp-surface-border)' }}>
          <p className="text-xs" style={{ color: 'var(--cp-on-surface-muted)' }}>
            Al modificar participantes se recalculan automáticamente las posiciones y puntos.
          </p>
        </div>
      </div>
    </div>
  )
}
