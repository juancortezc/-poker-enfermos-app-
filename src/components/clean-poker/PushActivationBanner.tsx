'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, Share, AlertTriangle } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

const DISMISSED_KEY = 'push_banner_dismissed'
// Se vuelve a mostrar pasada una semana: insistir sin ser molesto.
const SNOOZE_DAYS = 7

function isSnoozed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = localStorage.getItem(DISMISSED_KEY)
    if (!stored) return false
    const dismissedAt = new Date(stored).getTime()
    if (Number.isNaN(dismissedAt)) return false
    return Date.now() - dismissedAt < SNOOZE_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/** iOS solo permite push si la app está instalada en la pantalla de inicio. */
function useIosNeedsInstall() {
  const [needsInstall, setNeedsInstall] = useState(false)

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean }
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      nav.standalone === true
    setNeedsInstall(isIos && !isStandalone)
  }, [])

  return needsInstall
}

export function PushActivationBanner() {
  const router = useRouter()
  const {
    isSupported,
    isInitializing,
    permission,
    pushSubscription,
    requestPermission,
    subscribeToPush,
  } = useNotifications()

  const iosNeedsInstall = useIosNeedsInstall()
  const [dismissed, setDismissed] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Se evalúa en el cliente para no romper el render del servidor.
  useEffect(() => {
    setDismissed(isSnoozed())
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, new Date().toISOString())
    } catch {
      // localStorage puede fallar en modo privado; el banner vuelve al recargar.
    }
  }

  const handleActivate = async () => {
    setLoading(true)
    setError('')
    try {
      if (permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) {
          setError('No se concedió el permiso. Actívalo en los ajustes del navegador.')
          return
        }
      }
      await subscribeToPush()
    } catch (err) {
      console.error('Error activando push desde el banner:', err)
      setError('No se pudo activar. Intenta desde Perfil → Notificaciones.')
    } finally {
      setLoading(false)
    }
  }

  // Nada que pedir: sin soporte, todavía cargando, ya suscrito o pospuesto.
  if (isInitializing || !isSupported || pushSubscription || dismissed) return null

  const blocked = permission === 'denied'

  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
        borderRadius: 'var(--cp-radius-lg)',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {blocked ? (
          <AlertTriangle className="w-5 h-5" style={{ color: '#f97316' }} />
        ) : iosNeedsInstall ? (
          <Share className="w-5 h-5" style={{ color: 'var(--cp-primary)' }} />
        ) : (
          <Bell className="w-5 h-5" style={{ color: 'var(--cp-primary)' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="font-semibold"
          style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
        >
          {blocked
            ? 'Notificaciones bloqueadas'
            : iosNeedsInstall
              ? 'Instala la app para recibir avisos'
              : 'Activa las notificaciones'}
        </p>

        <p
          className="mt-1"
          style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-medium)' }}
        >
          {blocked
            ? 'Las bloqueaste antes. Habilítalas para este sitio en los ajustes del navegador.'
            : iosNeedsInstall
              ? 'En iPhone: Compartir → "Agregar a pantalla de inicio". Luego actívalas desde ahí.'
              : 'Entérate de eliminaciones, cambios de blind, cumpleaños y el inicio de cada fecha.'}
        </p>

        {error && (
          <p className="mt-2" style={{ fontSize: 'var(--cp-caption-size)', color: '#f97316' }}>
            {error}
          </p>
        )}

        {!blocked && (
          <button
            onClick={iosNeedsInstall ? () => router.push('/perfil') : handleActivate}
            disabled={loading}
            className="mt-3 px-4 py-2 font-semibold transition-opacity"
            style={{
              background: 'var(--cp-primary)',
              color: 'var(--cp-on-primary)',
              borderRadius: 'var(--cp-radius-full)',
              fontSize: 'var(--cp-label-size)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Activando...' : iosNeedsInstall ? 'Ver cómo' : 'Activar'}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Descartar"
        className="flex-shrink-0 p-1 -m-1"
        style={{ color: 'var(--cp-on-surface-variant)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
