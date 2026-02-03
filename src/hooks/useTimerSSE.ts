'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useActiveGameDate } from './useActiveGameDate'

export interface TimerSSEData {
  serverTime: number
  status: 'active' | 'paused' | 'inactive' | 'completed'
  currentLevel: number
  timeRemaining: number
  totalElapsed: number
  smallBlind: number
  bigBlind: number
  nextSmallBlind: number | null
  nextBigBlind: number | null
  nextLevel: number | null
  gameDateId: number
  tournamentName: string
  dateNumber: number
  error?: string
}

interface UseTimerSSEReturn {
  data: TimerSSEData | null
  isConnected: boolean
  isLoading: boolean
  error: string | null
  formattedTime: string
  isActive: boolean
  isPaused: boolean
  reconnect: () => void
}

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function useTimerSSEInternal(gameDateId: number | null): UseTimerSSEReturn {
  const [data, setData] = useState<TimerSSEData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10

  const connect = useCallback(() => {
    if (!gameDateId) {
      setData(null)
      setIsConnected(false)
      setIsLoading(false)
      return
    }

    // Limpiar conexión anterior
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsLoading(true)
    setError(null)

    const eventSource = new EventSource(`/api/timer/stream/${gameDateId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[SSE] Conectado al stream del timer')
      setIsConnected(true)
      setError(null)
      reconnectAttemptsRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as TimerSSEData

        if (parsed.error) {
          setError(parsed.error)
          setData(null)
        } else {
          setData(parsed)
          setError(null)
        }
        setIsLoading(false)
      } catch (err) {
        console.error('[SSE] Error parsing data:', err)
      }
    }

    eventSource.onerror = () => {
      console.log('[SSE] Error en conexión, intentando reconectar...')
      setIsConnected(false)
      eventSource.close()
      eventSourceRef.current = null

      // Reconexión con backoff exponencial
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`[SSE] Reconectando (intento ${reconnectAttemptsRef.current})...`)
          connect()
        }, delay)
      } else {
        setError('No se pudo conectar al timer. Intenta recargar la página.')
        setIsLoading(false)
      }
    }
  }, [gameDateId])

  // Reconectar cuando la página vuelve a ser visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && gameDateId) {
        console.log('[SSE] Página visible, verificando conexión...')
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          reconnectAttemptsRef.current = 0
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [gameDateId, connect])

  // Conectar cuando cambia el gameDateId
  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [connect])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  return {
    data,
    isConnected,
    isLoading,
    error,
    formattedTime: formatTime(data?.timeRemaining ?? 0),
    isActive: data?.status === 'active',
    isPaused: data?.status === 'paused',
    reconnect
  }
}

/**
 * Hook para el timer usando SSE - se conecta automáticamente a la fecha activa
 */
export function useTimerSSE(): UseTimerSSEReturn {
  const { gameDate: activeGameDate, isInProgress } = useActiveGameDate({
    refreshInterval: 5000
  })

  const gameDateId = activeGameDate && isInProgress ? activeGameDate.id : null
  return useTimerSSEInternal(gameDateId)
}

/**
 * Hook para el timer usando SSE - para un gameDateId específico
 */
export function useTimerSSEById(gameDateId: number | null): UseTimerSSEReturn {
  return useTimerSSEInternal(gameDateId)
}
