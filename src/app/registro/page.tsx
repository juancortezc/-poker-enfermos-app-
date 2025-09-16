'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import { TimerDisplay } from '@/components/registro/TimerDisplay'
import { GameStatsCards } from '@/components/registro/GameStatsCards'
import { EliminationForm } from '@/components/registro/EliminationForm'
import { EliminationHistory } from '@/components/registro/EliminationHistory'
import { calculatePointsForPosition } from '@/lib/tournament-utils'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useGameDateLiveStatus } from '@/hooks/useGameDateLiveStatus'
import { adaptiveIntervals } from '@/lib/swr-config'

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

interface TimerData {
  currentLevel: number
  timeRemaining: number
  blindLevels: Array<{
    level: number
    smallBlind: number
    bigBlind: number
    duration: number
  }>
}

export default function RegistroPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Track page visibility for optimized intervals
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Use SWR hooks with mobile-optimized intervals instead of manual setInterval
  const { 
    gameDate: activeGameDate, 
    isInProgress,
    isLoading: gameDateLoading,
    isError: gameDateError,
    error: gameDateErrorObj
  } = useActiveGameDate({
    refreshInterval: isVisible 
      ? adaptiveIntervals.liveGame.foreground 
      : adaptiveIntervals.liveGame.background
  })

  const { 
    data: liveData,
    isLoading: liveDataLoading,
    isError: liveDataError,
    mutate: refreshLiveData
  } = useGameDateLiveStatus(activeGameDate?.id || null, {
    refreshInterval: isVisible 
      ? adaptiveIntervals.liveGame.foreground 
      : adaptiveIntervals.liveGame.background
  })

  // Derived states from SWR data
  const loading = gameDateLoading || (activeGameDate && liveDataLoading)
  const error = gameDateError 
    ? 'No hay fecha activa' 
    : liveDataError 
      ? 'Error al cargar datos de la fecha'
      : null
  
  const players = liveData?.players || []
  const eliminations = liveData?.eliminations || []
  const timerData = liveData?.timer || null

  // Verificación de permisos
  if (!user || !canCRUD(user.role)) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
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
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red mx-auto mb-4"></div>
          <p className="text-poker-muted">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error || !activeGameDate) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
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

  // Timer data
  const currentBlind = timerData?.blindLevels?.find(b => b.level === timerData.currentLevel)
  const timeRemaining = timerData?.timeRemaining || 0

  return (
    <div className="min-h-screen bg-poker-dark pb-20">
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

        {/* Timer */}
        <div className="p-3 space-y-3">
          <TimerDisplay 
            timeRemaining={timeRemaining}
            currentBlind={currentBlind}
          />

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
              players={players}
              eliminations={eliminations}
              nextPosition={nextPosition}
              onEliminationCreated={refreshLiveData}
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
            onEliminationUpdated={refreshLiveData}
          />
        </div>
      </div>
    </div>
  )
}