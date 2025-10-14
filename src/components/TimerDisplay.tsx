'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useGameDateLiveStatus } from '@/hooks/useGameDateLiveStatus'
import { useNotifications } from '@/hooks/useNotifications'
import { useTimerStateById } from '@/hooks/useTimerState'
import { useWakeLock } from '@/hooks/useWakeLock'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Pause, Bell, BellOff, Smartphone, SmartphoneNfc } from 'lucide-react'
import { canCRUD } from '@/lib/auth'
import { buildAuthHeaders } from '@/lib/client-auth'

interface TimerDisplayProps {
  gameDateId?: number
}

export default function TimerDisplay({ gameDateId }: TimerDisplayProps) {
  const router = useRouter()
  const { user } = useAuth()
  const canControl = user && canCRUD(user.role)
  
  // Obtener fecha activa si no se especifica gameDateId
  const { gameDate: activeGameDate } = useActiveGameDate()
  const effectiveGameDateId = gameDateId || activeGameDate?.id || null
  
  // Estado "público" para notificaciones y datos generales
  const { 
    liveStatus, 
    isLoading: liveLoading, 
    isError,
    refresh,
  } = useGameDateLiveStatus(effectiveGameDateId)

  // Estado autoritativo del timer (TimerState)
  const {
    timerState,
    currentBlindLevel,
    nextBlindLevel,
    formattedTimeRemaining,
    isLoading: timerLoading,
    isActive: timerActive,
    isPaused: timerPaused,
    refresh: refreshTimer
  } = useTimerStateById(effectiveGameDateId)

  // Hook de notificaciones
  const {
    isSupported: notificationSupported,
    permission,
    preferences,
    notifyTimerWarning,
    notifyBlindChange,
  } = useNotifications()

  const [isControlling, setIsControlling] = useState(false)
  const [lastNotifiedLevel, setLastNotifiedLevel] = useState<number | null>(null)
  const [lastWarningLevel, setLastWarningLevel] = useState<number | null>(null)

  // Wake Lock para mantener pantalla activa
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, request: requestWakeLock, release: releaseWakeLock } = useWakeLock()

  const isGameActive = timerActive && !timerPaused

  const activeBlind = currentBlindLevel || liveStatus?.currentBlind || null
  const timeRemainingSeconds = timerState?.timeRemaining ?? activeBlind?.timeRemaining ?? 0
  const durationMinutes = activeBlind?.duration ?? 0
  const displayTime = durationMinutes === 0 ? 'SIN LÍMITE' : formattedTimeRemaining
  const isCriticalTime = durationMinutes > 0 && timeRemainingSeconds < 300

  // Auto-avance cuando el timer llega a 0 (solo para usuarios con permisos de control)
  useEffect(() => {
    const shouldAutoAdvance =
      canControl && // Solo usuarios de Comisión pueden auto-avanzar
      timerState &&
      timerActive &&
      !timerPaused &&
      timeRemainingSeconds <= 0 &&
      durationMinutes > 0 &&
      effectiveGameDateId

    if (!shouldAutoAdvance || isControlling) return

    const autoLevelUp = async () => {
      const nextLevel = timerState.currentLevel + 1

      // Verificar si existe siguiente nivel
      if (!nextBlindLevel) {
        console.log('No hay más niveles, timer finalizado')
        return
      }

      console.log(`Auto-avanzando del nivel ${timerState.currentLevel} al ${nextLevel}`)
      setIsControlling(true)

      try {
        const response = await fetch(`/api/timer/game-date/${effectiveGameDateId}/level-up`, {
          method: 'POST',
          headers: buildAuthHeaders({}, { includeJson: true }),
          body: JSON.stringify({ toLevel: nextLevel })
        })

        if (response.ok) {
          console.log(`Auto-avance exitoso al nivel ${nextLevel}`)
          await Promise.all([refresh(), refreshTimer()])
        } else {
          const error = await response.json()
          console.error('Error en auto-avance:', error)
        }
      } catch (error) {
        console.error('Error ejecutando auto-avance:', error)
      } finally {
        setIsControlling(false)
      }
    }

    // Pequeño delay para evitar múltiples llamadas
    const timer = setTimeout(autoLevelUp, 500)
    return () => clearTimeout(timer)
  }, [
    canControl,
    timerState,
    timerActive,
    timerPaused,
    timeRemainingSeconds,
    durationMinutes,
    effectiveGameDateId,
    isControlling,
    nextBlindLevel,
    refresh,
    refreshTimer
  ])

  const handlePause = async () => {
    if (!effectiveGameDateId || isControlling) return
    setIsControlling(true)
    try {
      const response = await fetch(`/api/timer/game-date/${effectiveGameDateId}/pause`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true })
      })
      if (response.ok) {
        await Promise.all([refresh(), refreshTimer()])
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
        headers: buildAuthHeaders({}, { includeJson: true })
      })
      if (response.ok) {
        await Promise.all([refresh(), refreshTimer()])
      }
    } catch (error) {
      console.error('Error resuming timer:', error)
    } finally {
      setIsControlling(false)
    }
  }

  // Notificaciones automáticas cuando cambia el blind o queda 1 minuto
  useEffect(() => {
    if (!liveStatus || !liveStatus.currentBlind || !notificationSupported || permission !== 'granted') {
      return
    }

    const { currentBlind } = liveStatus
    const timeRemaining = currentBlind.timeRemaining || 0
    const currentLevel = currentBlind.level

    if (!isGameActive) return

    // Aviso de 1 minuto restante
    if (timeRemaining <= 60 && timeRemaining > 55 && lastWarningLevel !== currentLevel) {
      if (preferences.timer.oneMinuteWarning) {
        notifyTimerWarning()
        setLastWarningLevel(currentLevel)
      }
    }

    // Notificación de cambio de nivel
    if (lastNotifiedLevel !== null && currentLevel !== lastNotifiedLevel) {
      if (preferences.timer.blindChange) {
        notifyBlindChange(currentLevel, currentBlind.smallBlind || 0, currentBlind.bigBlind || 0)
      }
    }

    if (currentLevel !== lastNotifiedLevel) {
      setLastNotifiedLevel(currentLevel)
    }
  }, [
    liveStatus,
    isGameActive,
    notificationSupported,
    permission,
    preferences,
    notifyTimerWarning,
    notifyBlindChange,
    lastNotifiedLevel,
    lastWarningLevel
  ])

  if (liveLoading || timerLoading) {
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

  if (activeGameDate?.status === 'CREATED') {
    return (
      <div className="admin-card p-8 text-center">
        <div className="text-6xl mb-4">⏱️</div>
        <h3 className="text-xl font-semibold text-white mb-2">Fecha Configurada</h3>
        <p className="text-poker-muted mb-4">Fecha {activeGameDate.dateNumber} lista para iniciar</p>
        {canControl && (
          <button 
            onClick={() => router.push(`/game-dates/${activeGameDate.id}/confirm`)}
            className="btn-admin-primary"
          >
            Ir a Iniciar Fecha
          </button>
        )}
      </div>
    )
  }

  if (!effectiveGameDateId || (!liveStatus && !timerState)) {
    return (
      <div className="admin-card p-8 text-center">
        <div className="text-6xl mb-4">⏸️</div>
        <h3 className="text-xl font-semibold text-white mb-2">Sin fecha activa</h3>
        <p className="text-poker-muted">El timer se activará cuando inicie una fecha de juego</p>
      </div>
    )
  }

  return (
    <Card className="admin-card overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-gradient-to-b from-poker-dark to-poker-dark-lighter p-8">
          <div className="relative z-10">
            <div
              className={`text-7xl md:text-8xl font-mono font-black text-center mb-2 ${
                isCriticalTime ? 'text-red-500 animate-pulse' : 'text-white'
              }`}
              style={{ letterSpacing: '0.1em' }}
            >
              {displayTime}
            </div>
            {activeBlind && (
              <div className="text-sm md:text-base font-semibold text-center text-white/80">
                Blinds: {activeBlind.smallBlind}/{activeBlind.bigBlind}
              </div>
            )}
          </div>
        </div>

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

            <div className="space-y-3">
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

                <button
                  onClick={() => window.location.href = '/notificaciones'}
                  className="btn-admin-secondary h-14 flex items-center justify-center gap-2"
                >
                  <Bell className="w-5 h-5" />
                  CONFIG
                </button>
              </div>

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
                  className={`w-full h-12 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    wakeLockActive
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'btn-admin-secondary'
                  }`}
                >
                  {wakeLockActive ? (
                    <>
                      <SmartphoneNfc className="w-4 h-4" />
                      PANTALLA ACTIVA
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      MANTENER ACTIVA
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
