'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useGameDateLiveStatus } from '@/hooks/useGameDateLiveStatus'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Pause } from 'lucide-react'
import { canCRUD } from '@/lib/auth'
import { formatTime } from '@/lib/timer-utils'

interface TimerDisplayProps {
  gameDateId?: number
}

export default function TimerDisplay({ gameDateId }: TimerDisplayProps) {
  const { user } = useAuth()
  const canControl = user && canCRUD(user.role)
  
  // Obtener fecha activa si no se especifica gameDateId
  const { gameDate: activeGameDate } = useActiveGameDate()
  const effectiveGameDateId = gameDateId || activeGameDate?.id || null
  
  // Obtener estado en tiempo real
  const { 
    liveStatus, 
    isLoading, 
    isError,
    refresh,
    isGameActive
  } = useGameDateLiveStatus(effectiveGameDateId)

  // Estado local para controles
  const [isControlling, setIsControlling] = useState(false)

  // Control handlers
  const handlePause = async () => {
    if (!effectiveGameDateId || isControlling) return
    setIsControlling(true)
    try {
      const response = await fetch(`/api/timer/game-date/${effectiveGameDateId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        refresh()
      }
    } catch (error) {
      console.error('Error pausing timer:', error)
    } finally {
      setIsControlling(false)
    }
  }

  const handleResume = async () => {
    if (!effectiveGameDateId || isControlling) return
    setIsControlling(true)
    try {
      const response = await fetch(`/api/timer/game-date/${effectiveGameDateId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        refresh()
      }
    } catch (error) {
      console.error('Error resuming timer:', error)
    } finally {
      setIsControlling(false)
    }
  }


  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="admin-card p-8">
          <div className="h-32 bg-white/5 rounded-lg mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-white/5 rounded-lg"></div>
            <div className="h-20 bg-white/5 rounded-lg"></div>
            <div className="h-20 bg-white/5 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="admin-card-error p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-white mb-2">Error cargando timer</h3>
        <p className="text-poker-muted mb-4">No se pudo conectar con el servidor</p>
        <button 
          onClick={refresh}
          className="btn-admin-primary"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // No active game
  if (!effectiveGameDateId || !liveStatus) {
    return (
      <div className="admin-card p-8 text-center">
        <div className="text-6xl mb-4">⏸️</div>
        <h3 className="text-xl font-semibold text-white mb-2">Sin fecha activa</h3>
        <p className="text-poker-muted">El timer se activará cuando inicie una fecha de juego</p>
      </div>
    )
  }

  const { currentBlind } = liveStatus
  const timeRemaining = currentBlind?.timeRemaining || 0
  const duration = currentBlind?.duration || 20

  // Formatear tiempo
  const formattedTime = duration === 0 
    ? "SIN LÍMITE" 
    : formatTime(Math.floor(timeRemaining))

  // Determinar si el tiempo es crítico (menos de 5 minutos)
  const isCriticalTime = duration > 0 && timeRemaining < 300

  return (
    <Card className="admin-card overflow-hidden">
      <CardContent className="p-0">
        {/* Time Display */}
        <div className="relative bg-gradient-to-b from-poker-dark to-poker-dark-lighter p-8">
          <div className="relative z-10">
            <div className={`text-7xl md:text-8xl font-mono font-black text-center mb-2 ${
              isCriticalTime ? 'text-red-500 animate-pulse' : 'text-white'
            }`} style={{ letterSpacing: '0.1em' }}>
              {formattedTime}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        {canControl && (
          <div className="border-t border-white/10 p-6 bg-poker-dark">
            <div className="grid grid-cols-2 gap-4">
              {isGameActive ? (
                <button 
                  onClick={handlePause}
                  disabled={isControlling}
                  className="btn-admin-neutral h-14 flex items-center justify-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  PAUSAR
                </button>
              ) : (
                <button 
                  onClick={handleResume}
                  disabled={isControlling}
                  className="btn-admin-primary h-14 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  REINICIAR
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}