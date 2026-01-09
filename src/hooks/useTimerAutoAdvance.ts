'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from './useActiveGameDate'
import { useTimerState } from './useTimerState'
import { useNotifications } from './useNotifications'
import { buildAuthHeaders } from '@/lib/client-auth'

/**
 * Hook que maneja el auto-avance del timer y las notificaciones.
 * Debe usarse en un componente que esté visible cuando hay fecha en vivo.
 */
export function useTimerAutoAdvance() {
  const { user } = useAuth()
  const canControl = user?.role === 'Comision'

  const { gameDate: activeGameDate } = useActiveGameDate()
  const gameDateId = activeGameDate?.id || null

  const {
    timerState,
    currentBlindLevel,
    nextBlindLevel,
    displayTimeRemaining,
    isActive,
    isPaused,
    refresh
  } = useTimerState()

  const {
    isSupported: notificationSupported,
    permission,
    preferences,
    notifyTimerWarning,
    notifyBlindChange
  } = useNotifications()

  const [isControlling, setIsControlling] = useState(false)
  const lastNotifiedLevelRef = useRef<number | null>(null)
  const lastWarningLevelRef = useRef<number | null>(null)
  const autoAdvanceAttemptRef = useRef<number>(0)

  const isGameActive = isActive && !isPaused
  const currentLevel = timerState?.currentLevel ?? 0
  const duration = currentBlindLevel?.duration ?? 0

  // Auto-avance cuando el timer llega a 0
  useEffect(() => {
    if (!canControl) return
    if (!timerState || !isActive || isPaused) return
    if (displayTimeRemaining > 0) return
    if (duration === 0) return // Sin límite
    if (!gameDateId) return
    if (!nextBlindLevel) return
    if (isControlling) return

    // Evitar múltiples intentos para el mismo nivel
    if (autoAdvanceAttemptRef.current === currentLevel) return
    autoAdvanceAttemptRef.current = currentLevel

    const autoLevelUp = async () => {
      const nextLevel = currentLevel + 1
      console.log(`[Timer] Auto-avanzando del nivel ${currentLevel} al ${nextLevel}`)
      setIsControlling(true)

      try {
        const response = await fetch(`/api/timer/game-date/${gameDateId}/level-up`, {
          method: 'POST',
          headers: buildAuthHeaders({}, { includeJson: true }),
          body: JSON.stringify({ toLevel: nextLevel })
        })

        if (response.ok) {
          console.log(`[Timer] Auto-avance exitoso al nivel ${nextLevel}`)
          refresh()
        } else {
          const error = await response.json()
          console.error('[Timer] Error en auto-avance:', error)
          // Reset para permitir reintento
          autoAdvanceAttemptRef.current = 0
        }
      } catch (error) {
        console.error('[Timer] Error ejecutando auto-avance:', error)
        autoAdvanceAttemptRef.current = 0
      } finally {
        setIsControlling(false)
      }
    }

    // Pequeño delay para evitar race conditions
    const timer = setTimeout(autoLevelUp, 500)
    return () => clearTimeout(timer)
  }, [
    canControl,
    timerState,
    isActive,
    isPaused,
    displayTimeRemaining,
    duration,
    gameDateId,
    nextBlindLevel,
    currentLevel,
    isControlling,
    refresh
  ])

  // Reset del contador de intentos cuando cambia el nivel
  useEffect(() => {
    if (currentLevel > 0 && autoAdvanceAttemptRef.current !== currentLevel) {
      autoAdvanceAttemptRef.current = 0
    }
  }, [currentLevel])

  // Notificación de 1 minuto restante
  useEffect(() => {
    if (!isGameActive) return
    if (!notificationSupported || permission !== 'granted') return
    if (!preferences?.timer?.oneMinuteWarning) return
    if (duration === 0) return // Sin límite
    if (displayTimeRemaining > 60 || displayTimeRemaining <= 55) return
    if (lastWarningLevelRef.current === currentLevel) return

    console.log(`[Timer] Notificando 1 minuto restante para nivel ${currentLevel}`)
    notifyTimerWarning()
    lastWarningLevelRef.current = currentLevel
  }, [
    isGameActive,
    notificationSupported,
    permission,
    preferences?.timer?.oneMinuteWarning,
    duration,
    displayTimeRemaining,
    currentLevel,
    notifyTimerWarning
  ])

  // Notificación de cambio de nivel
  useEffect(() => {
    if (!isGameActive) return
    if (!notificationSupported || permission !== 'granted') return
    if (!preferences?.timer?.blindChange) return
    if (!currentBlindLevel) return

    const prevLevel = lastNotifiedLevelRef.current

    // Solo notificar si cambió el nivel (y no es la primera carga)
    if (prevLevel !== null && currentLevel !== prevLevel) {
      console.log(`[Timer] Notificando cambio de nivel ${prevLevel} -> ${currentLevel}`)
      notifyBlindChange(
        currentLevel,
        currentBlindLevel.smallBlind,
        currentBlindLevel.bigBlind
      )
    }

    lastNotifiedLevelRef.current = currentLevel
  }, [
    isGameActive,
    notificationSupported,
    permission,
    preferences?.timer?.blindChange,
    currentLevel,
    currentBlindLevel,
    notifyBlindChange
  ])

  return {
    isControlling,
    canControl,
    isGameActive
  }
}
