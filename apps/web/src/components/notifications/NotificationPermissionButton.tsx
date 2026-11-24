'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, CheckCircle } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'

interface NotificationPermissionButtonProps {
  className?: string
}

export function NotificationPermissionButton({ className }: NotificationPermissionButtonProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      checkSubscriptionStatus()
    }
  }, [])

  const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Error checking subscription status:', error)
    }
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setError('Tu navegador no soporta notificaciones')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission === 'granted') {
        await subscribeToNotifications()
      } else {
        setError('Permisos de notificación denegados')
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
      setError('Error al solicitar permisos')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator)) return

    try {
      // Register service worker if not already registered
      let registration
      try {
        registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js')
        }
      } catch (error) {
        console.warn('Service Worker not available, using basic notification permission')
        setIsSubscribed(true)
        return
      }

      await navigator.serviceWorker.ready

      // Get VAPID public key
      const vapidResponse = await fetch('/api/notifications/vapid-key')
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key')
      }
      const { publicKey } = await vapidResponse.json()

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      })

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setIsSubscribed(true)
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      setError('Error al activar notificaciones')
    }
  }

  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          Activando...
        </>
      )
    }

    if (permission === 'granted' && isSubscribed) {
      return (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          Notificaciones Activas
        </>
      )
    }

    if (permission === 'denied') {
      return (
        <>
          <BellOff className="w-4 h-4 mr-2" />
          Notificaciones Bloqueadas
        </>
      )
    }

    return (
      <>
        <Bell className="w-4 h-4 mr-2" />
        Activar Notificaciones
      </>
    )
  }

  const getButtonVariant = () => {
    if (permission === 'granted' && isSubscribed) {
      return 'bg-emerald-600 hover:bg-emerald-700'
    }
    if (permission === 'denied') {
      return 'bg-gray-600 hover:bg-gray-700 cursor-not-allowed'
    }
    return 'bg-gradient-to-r from-black to-poker-red hover:from-black/90 hover:to-poker-red/90'
  }

  if (!('Notification' in window)) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        onClick={requestPermission}
        disabled={loading || permission === 'denied' || (permission === 'granted' && isSubscribed)}
        className={`w-full ${getButtonVariant()} text-white shadow-[0_14px_30px_rgba(255,93,143,0.35)] hover:shadow-[0_18px_40px_rgba(255,93,143,0.45)] hover:-translate-y-0.5 transition-all duration-200 rounded-full font-semibold`}
      >
        {getButtonContent()}
      </Button>

      {error && (
        <p className="text-xs text-rose-400 text-center">{error}</p>
      )}

      {permission === 'denied' && (
        <p className="text-xs text-white/60 text-center">
          Para activar notificaciones, ve a la configuración de tu navegador y permite notificaciones para este sitio
        </p>
      )}

      {permission === 'granted' && isSubscribed && (
        <p className="text-xs text-emerald-400 text-center">
          ✅ Recibirás notificaciones de eventos importantes
        </p>
      )}
    </div>
  )
}