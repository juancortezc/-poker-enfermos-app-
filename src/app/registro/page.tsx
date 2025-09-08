'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import { EliminationForm } from '@/components/eliminations/EliminationForm'
import { EliminationTable } from '@/components/eliminations/EliminationTable'
import { calculatePointsForPosition } from '@/lib/tournament-utils'

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

interface TimerState {
  currentLevel: number
  timeRemaining: number
  isActive: boolean
  blindLevels: Array<{
    level: number
    smallBlind: number
    bigBlind: number
    duration: number
  }>
}

export default function RegistroPage() {
  const { user } = useAuth()
  const [activeGameDate, setActiveGameDate] = useState<any>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [eliminations, setEliminations] = useState<Elimination[]>([])
  const [timerState, setTimerState] = useState<TimerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      // Fetch active game date
      const gameDateResponse = await fetch('/api/game-dates/active')
      if (gameDateResponse.ok) {
        const gameDateData = await gameDateResponse.json()
        setActiveGameDate(gameDateData)

        if (gameDateData?.id) {
          // Fetch players
          const playersResponse = await fetch(`/api/game-dates/${gameDateData.id}/players`)
          if (playersResponse.ok) {
            const playersData = await playersResponse.json()
            setPlayers(playersData)
          }

          // Fetch eliminations
          const eliminationsResponse = await fetch(`/api/eliminations/game-date/${gameDateData.id}`)
          if (eliminationsResponse.ok) {
            const eliminationsData = await eliminationsResponse.json()
            setEliminations(eliminationsData)
          }

          // Fetch timer state
          const timerResponse = await fetch(`/api/game-dates/${gameDateData.id}/live-status`)
          if (timerResponse.ok) {
            const timerData = await timerResponse.json()
            setTimerState(timerData.timer)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      setRefreshing(true)
      fetchData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const handleEliminationSaved = () => {
    fetchData()
  }

  if (!user || !canCRUD(user.role)) {
    return (
      <div className="min-h-screen bg-poker-green flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p>No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-green flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!activeGameDate) {
    return (
      <div className="min-h-screen bg-poker-green flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">No hay fecha activa</h1>
          <p>No existe una fecha de juego activa en este momento.</p>
        </div>
      </div>
    )
  }

  const totalPlayers = players.length
  const remainingPlayers = totalPlayers - eliminations.length
  const winnerPoints = calculatePointsForPosition(1, totalPlayers)
  const nextPosition = totalPlayers - eliminations.length

  // Get current blind level info
  const currentBlind = timerState?.blindLevels?.find(b => b.level === timerState.currentLevel)
  const timeDisplay = timerState?.timeRemaining ? 
    `${Math.floor(timerState.timeRemaining / 60)}:${String(timerState.timeRemaining % 60).padStart(2, '0')}` : '00:00'

  return (
    <div className="min-h-screen bg-poker-green pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold">REGISTRO</h1>
          <p className="text-lg">Fecha {activeGameDate.dateNumber}</p>
        </div>

        {/* Timer Section - Red Background */}
        <div className="bg-poker-red rounded-lg p-4 text-center text-white">
          <div className="text-3xl font-bold mb-2">{timeDisplay}</div>
          <div className="text-lg">
            {currentBlind ? `${currentBlind.smallBlind}/${currentBlind.bigBlind}` : 'Sin información'}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-600 rounded-lg p-4 text-center text-white">
            <div className="text-sm text-gray-300">Jugando</div>
            <div className="text-2xl font-bold text-orange-400">{remainingPlayers}</div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4 text-center text-white">
            <div className="text-sm text-gray-300">Jugadores</div>
            <div className="text-2xl font-bold">{totalPlayers}</div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4 text-center text-white">
            <div className="text-sm text-gray-300">PTS Ganador</div>
            <div className="text-2xl font-bold">{winnerPoints}</div>
          </div>
        </div>

        {/* Elimination Form */}
        <div className="bg-poker-card rounded-lg p-6">
          <EliminationForm
            gameDate={activeGameDate}
            players={players}
            eliminations={eliminations}
            onEliminationSaved={handleEliminationSaved}
            nextPosition={nextPosition}
          />
        </div>

        {/* Elimination History Table */}
        {eliminations.length > 0 && (
          <div className="bg-poker-card rounded-lg p-6">
            <EliminationTable
              eliminations={eliminations}
              onEliminationUpdated={handleEliminationSaved}
            />
          </div>
        )}
      </div>
    </div>
  )
}