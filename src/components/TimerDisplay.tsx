'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useTimerState, useTimerStateById } from '@/hooks/useTimerState'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Pause, Bell, BellOff } from 'lucide-react'
import { canCRUD } from '@/lib/auth'

interface TimerDisplayProps {
  gameDateId?: number
}

export default function TimerDisplay({ gameDateId }: TimerDisplayProps) {
  const { user } = useAuth()
  const canControl = user && canCRUD(user.role)
  
  // Usar el hook de timer apropiado
  const timerHookResult = gameDateId 
    ? useTimerStateById(gameDateId)
    : useTimerState()
    
  const {
    timerState,
    currentBlindLevel,
    nextBlindLevel,
    isLoading,
    isError,
    refresh,
    isActive: isTimerActive,
    isPaused: isTimerPaused,
    formattedTimeRemaining
  } = timerHookResult

  // Hook de notificaciones
  const {
    isSupported: notificationSupported,
    permission,
    preferences,
    notifyTimerWarning,
    notifyBlindChange,
  } = useNotifications()

  // Estado local para controles y notificaciones
  const [isControlling, setIsControlling] = useState(false)
  const [lastNotifiedLevel, setLastNotifiedLevel] = useState<number | null>(null)
  const [lastWarningTime, setLastWarningTime] = useState<number | null>(null)

  // Get effective game date ID from timer state
  const effectiveGameDateId = timerState?.gameDateId

  // Control handlers
  const handlePause = async () => {
    if (!effectiveGameDateId || isControlling) return
    setIsControlling(true)
    try {
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const response = await fetch(`/api/timer/game-date/${effectiveGameDateId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
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
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const response = await fetch(`/api/timer/game-date/${effectiveGameDateId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
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

  // Efecto para manejar notificaciones de timer
  useEffect(() => {
    if (!timerState || !currentBlindLevel || !notificationSupported || permission !== 'granted') {
      return;
    }

    const timeRemaining = timerState.timeRemaining || 0;
    const currentLevel = timerState.currentLevel;
    const duration = currentBlindLevel.duration || 0;

    // Solo procesar si el timer está activo y tiene duración definida
    if (!isTimerActive || duration === 0) return;

    // Notificación de 1 minuto restante
    if (timeRemaining <= 60 && timeRemaining > 55 && lastWarningTime !== currentLevel) {
      if (preferences.timer.oneMinuteWarning) {
        notifyTimerWarning();
        setLastWarningTime(currentLevel);
      }
    }

    // Notificación de cambio de nivel (cuando el nivel cambia)
    if (currentLevel !== lastNotifiedLevel && lastNotifiedLevel !== null) {
      if (preferences.timer.blindChange) {
        const smallBlind = currentBlindLevel.smallBlind || 0;
        const bigBlind = currentBlindLevel.bigBlind || 0;
        notifyBlindChange(currentLevel, smallBlind, bigBlind);
      }
    }

    // Actualizar el último nivel notificado
    if (currentLevel !== lastNotifiedLevel) {
      setLastNotifiedLevel(currentLevel);
    }

  }, [
    timerState, 
    currentBlindLevel,
    isTimerActive, 
    notificationSupported, 
    permission, 
    preferences,
    notifyTimerWarning,
    notifyBlindChange,
    lastNotifiedLevel,
    lastWarningTime
  ]);

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
  if (!effectiveGameDateId || !timerState) {
    return (
      <div className="admin-card p-8 text-center">
        <div className="text-6xl mb-4">⏸️</div>
        <h3 className="text-xl font-semibold text-white mb-2">Sin fecha activa</h3>
        <p className="text-poker-muted">El timer se activará cuando inicie una fecha de juego</p>
      </div>
    )
  }

  const timeRemaining = timerState.timeRemaining || 0
  const duration = currentBlindLevel?.duration || 20

  // Usar el tiempo formateado del hook
  const formattedTime = duration === 0 
    ? "SIN LÍMITE" 
    : formattedTimeRemaining

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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {notificationSupported && permission === 'granted' ? (
                  <>
                    <Bell className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">Notificaciones activas</span>
                  </>
                ) : notificationSupported && permission === 'denied' ? (
                  <>
                    <BellOff className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">Notificaciones bloqueadas</span>
                  </>
                ) : notificationSupported ? (
                  <>
                    <Bell className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400">Notificaciones pendientes</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">No soportado</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {isTimerActive ? (
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
              
              {/* Botón de configuración de notificaciones */}
              <button
                onClick={() => window.location.href = '/notificaciones'}
                className="btn-admin-secondary h-14 flex items-center justify-center gap-2"
              >
                <Bell className="w-5 h-5" />
                CONFIG
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}