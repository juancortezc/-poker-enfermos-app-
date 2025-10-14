import { useState, useEffect, useCallback, useRef } from 'react'

interface UseWakeLockReturn {
  isSupported: boolean
  isActive: boolean
  request: () => Promise<boolean>
  release: () => Promise<void>
  error: Error | null
}

/**
 * Hook para mantener la pantalla activa usando Wake Lock API
 *
 * Uso:
 * ```tsx
 * const { isSupported, isActive, request, release } = useWakeLock()
 *
 * // Activar wake lock
 * await request()
 *
 * // Desactivar wake lock
 * await release()
 * ```
 *
 * @param autoRequest - Si debe solicitar wake lock automáticamente al montar (default: false)
 * @returns Objeto con estado y funciones de control
 */
export function useWakeLock(autoRequest = false): UseWakeLockReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Verificar soporte al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      setIsSupported(true)
    }
  }, [])

  // Función para solicitar wake lock
  const request = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      const err = new Error('Wake Lock API no soportado en este navegador')
      setError(err)
      console.warn('[Wake Lock]', err.message)
      return false
    }

    try {
      // Si ya está activo, no hacer nada
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        console.log('[Wake Lock] Ya está activo')
        return true
      }

      const wakeLock = await navigator.wakeLock.request('screen')
      wakeLockRef.current = wakeLock
      setIsActive(true)
      setError(null)
      console.log('[Wake Lock] Activado exitosamente')

      // Listener para cuando se libera automáticamente
      wakeLock.addEventListener('release', () => {
        console.log('[Wake Lock] Liberado automáticamente')
        setIsActive(false)
      })

      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido')
      setError(error)
      console.error('[Wake Lock] Error al activar:', error)
      return false
    }
  }, [isSupported])

  // Función para liberar wake lock
  const release = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        setIsActive(false)
        console.log('[Wake Lock] Liberado manualmente')
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error desconocido')
        setError(error)
        console.error('[Wake Lock] Error al liberar:', error)
      }
    }
  }, [])

  // Re-solicitar wake lock cuando la página se hace visible (después de bloqueo/desbloqueo)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && wakeLockRef.current?.released) {
        console.log('[Wake Lock] Página visible, re-solicitando wake lock')
        request()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive, request])

  // Auto-request si está habilitado
  useEffect(() => {
    if (autoRequest && isSupported) {
      request()
    }

    // Cleanup: liberar al desmontar
    return () => {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release()
      }
    }
  }, [autoRequest, isSupported, request])

  return {
    isSupported,
    isActive,
    request,
    release,
    error
  }
}
