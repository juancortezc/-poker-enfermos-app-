'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AlertTriangle, UserCog } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { buildAuthHeaders } from '@/lib/client-auth'

interface ProfileStatusResponse {
  profileComplete: boolean
  checks: {
    hasPinConfigured: boolean
    hasContactInfo: boolean
    hasBirthDate: boolean
    hasPhoto: boolean
  }
}

const STORAGE_KEY_PREFIX = 'profile-prompt-dismissed'

const getStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}:${userId}`

export function ProfileCompletionPrompt() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<ProfileStatusResponse | null>(null)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shouldBypass = useMemo(() => {
    if (!user) return true
    if (pathname === '/perfil') return true
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(getStorageKey(user.id)) === '1'
  }, [user, pathname])

  useEffect(() => {
    if (!user || shouldBypass) return

    // Skip if no auth credentials are available
    if (typeof window !== 'undefined') {
      const hasPin = localStorage.getItem('poker-pin')
      const hasAdminKey = localStorage.getItem('poker-adminkey')
      if (!hasPin && !hasAdminKey) {
        console.debug('Profile status check: No credentials found, skipping')
        return
      }
    }

    let cancelled = false

    const fetchStatus = async () => {
      try {
        setLoading(true)
        setError(null)
        const headers = buildAuthHeaders()
        const response = await fetch('/api/profile/status', { headers })

        if (!response.ok) {
          // Si falla con 401, probablemente no hay credenciales válidas
          // En lugar de mostrar error, simplemente no mostramos el prompt
          if (response.status === 401) {
            console.debug('Profile status check: Unauthorized, skipping prompt')
            return
          }
          throw new Error('Error al verificar el perfil')
        }

        const data: ProfileStatusResponse = await response.json()
        if (!cancelled) {
          setStatus(data)
          setVisible(!data.profileComplete)
        }
      } catch (err) {
        // Solo mostramos error si no es un 401 (que ya manejamos arriba)
        console.debug('Profile status check failed:', err)
        // No seteamos error visible para evitar spam al usuario
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStatus()

    return () => {
      cancelled = true
    }
  }, [user, shouldBypass])

  useEffect(() => {
    if (pathname === '/perfil') {
      setVisible(false)
    }
  }, [pathname])

  if (!user || !visible || loading) return null

  const missingItems: string[] = []

  if (status) {
    if (!status.checks.hasPinConfigured) {
      missingItems.push('Configura tu PIN de 4 dígitos')
    }
    if (!status.checks.hasContactInfo) {
      missingItems.push('Agrega tu correo o teléfono de contacto')
    }
    if (!status.checks.hasBirthDate) {
      missingItems.push('Registra tu fecha de nacimiento')
    }
    if (!status.checks.hasPhoto) {
      missingItems.push('Actualiza tu foto de perfil')
    }
  }

  const dismiss = () => {
    setVisible(false)
    if (typeof window !== 'undefined' && user) {
      sessionStorage.setItem(getStorageKey(user.id), '1')
    }
  }

  const goToProfile = () => {
    if (user) {
      sessionStorage.setItem(getStorageKey(user.id), '1')
    }
    setVisible(false)
    router.push('/perfil')
  }

  return (
    <div className="fixed bottom-40 left-1/2 z-60 w-full max-w-md -translate-x-1/2 px-4">
      <div className="overflow-hidden rounded-2xl border border-yellow-500/40 bg-black/90 backdrop-blur-md shadow-2xl">
        <div className="relative p-4 sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.18),_transparent_70%)]" />
          <div className="relative flex items-start gap-3 text-sm text-white/90">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/90 text-black shadow-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white">Completa tu perfil</h3>
              {error ? (
                <p className="mt-2 text-xs text-red-300">{error}</p>
              ) : (
                <div className="mt-2 space-y-1.5 text-xs text-white/80">
                  <p className="text-white/85">
                    Necesitamos algunos datos para mantener tu cuenta segura y poder contactarte.
                  </p>
                  {missingItems.length > 0 && (
                    <ul className="space-y-1 pl-4">
                      {missingItems.map((item) => (
                        <li key={item} className="list-disc">{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-4 flex items-center justify-end gap-3 text-xs sm:text-sm">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-3 py-2 text-white/60 transition-colors hover:text-white"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={goToProfile}
              className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 font-semibold text-black shadow-lg transition-transform hover:scale-[1.02]"
            >
              <UserCog className="h-4 w-4" />
              Actualizar ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileCompletionPrompt
