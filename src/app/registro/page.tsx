'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import { TimerDisplay } from '@/components/registro/TimerDisplay'
import { GameStatsCards } from '@/components/registro/GameStatsCards'
import { EliminationForm } from '@/components/registro/EliminationForm'
import { EliminationHistory } from '@/components/registro/EliminationHistory'
import { calculatePointsForPosition } from '@/lib/tournament-utils'
import { buildAuthHeaders } from '@/lib/client-auth'
import { useTimerStateById } from '@/hooks/useTimerState'
import { formatTime } from '@/lib/timer-utils'

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

  const {
    timerState,
    currentBlindLevel,
    formattedTimeRemaining,
    isActive: timerIsActive,
    isPaused: timerIsPaused
  } = useTimerStateById(activeGameDate?.id ?? null)

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
  if (!user || !canCRUD(user.role)) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-poker-muted">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  // Estados de carga y error
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red mx-auto mb-4"></div>
          <p className="text-poker-muted">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error || !activeGameDate) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">No hay fecha activa</h1>
          <p className="text-poker-muted">{error || 'No existe una fecha de juego activa en este momento.'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-poker-card hover:bg-poker-card/80 text-white rounded-lg transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
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

  return (
    <div>
      <div className="max-w-lg mx-auto">
        
        {/* Header */}
        <div className="flex items-center p-2">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-poker-muted hover:text-white transition-colors mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm">Regresar</span>
          </button>
          <h1 className="text-lg font-bold text-white">
            REGISTRO FECHA #{activeGameDate.dateNumber}
          </h1>
        </div>

        {/* Timer / Start Button */}
        <div className="p-3 space-y-3">
          {activeGameDate.status === 'CREATED' ? (
            <button
              onClick={handleStartGame}
              className="w-full px-6 py-4 bg-poker-red hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              INICIAR FECHA
            </button>
          ) : (
            <TimerDisplay 
              timeRemaining={timerSeconds}
              formattedTime={displayFormatted}
              status={timerStatus}
              currentBlind={displayBlind}
            />
          )}

          {/* Stats Cards */}
          <GameStatsCards
            activePlayers={activePlayers}
            totalPlayers={totalPlayers}
            winnerPoints={winnerPoints}
          />

          {/* Elimination Form */}
          {activePlayers > 1 && (
            <EliminationForm
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
            <div className="bg-poker-red/20 border border-poker-red/40 rounded-lg p-6 text-center">
              <h3 className="text-white text-xl font-bold mb-2">🎉 Juego Completado</h3>
              <p className="text-poker-red">
                El torneo ha terminado. ¡Felicitaciones al ganador!
              </p>
            </div>
          )}

          {/* Elimination History */}
          <EliminationHistory
            eliminations={eliminations}
            players={players}
            tournamentId={activeGameDate.tournament.id}
            gameDateId={activeGameDate.id}
            onEliminationUpdated={fetchAllData}
          />
        </div>
      </div>
    </div>
  )
}
