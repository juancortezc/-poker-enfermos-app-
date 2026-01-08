'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { LogOut, AlertTriangle, Loader2 } from 'lucide-react'

export default function CerrarSesionTab() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error('Error closing session:', error)
    }
    setLoading(false)
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '??'

  return (
    <div className="space-y-4">
      {/* User Info */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        {/* Avatar */}
        <div
          className="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #E53935, #f97316)',
          }}
        >
          {user?.photoUrl ? (
            <Image
              src={user.photoUrl}
              alt={`${user.firstName} ${user.lastName}`}
              fill
              className="object-cover"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-xl font-bold"
              style={{ color: 'white' }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Name */}
        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          {user?.firstName} {user?.lastName}
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--cp-on-surface-muted)' }}
        >
          Sesión activa
        </p>
      </div>

      {/* Warning */}
      {confirming && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(249, 115, 22, 0.1)',
            border: '1px solid rgba(249, 115, 22, 0.3)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f97316' }} />
            <div>
              <h3 className="font-semibold" style={{ color: '#f97316' }}>
                ¿Estás seguro?
              </h3>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--cp-on-surface-muted)' }}
              >
                Tendrás que ingresar tu PIN nuevamente para acceder
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {confirming ? (
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
            style={{
              background: '#E53935',
              color: 'white',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            {loading ? 'Cerrando sesión...' : 'Sí, cerrar sesión'}
          </button>

          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
            }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            color: '#E53935',
          }}
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      )}

      {/* Info */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p
          className="text-center"
          style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}
        >
          Al cerrar sesión se borrarán tus preferencias locales y tendrás que autenticarte nuevamente con tu PIN
        </p>
      </div>
    </div>
  )
}
