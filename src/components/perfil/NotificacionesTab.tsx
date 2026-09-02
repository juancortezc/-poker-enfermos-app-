'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell, BellOff, AlertTriangle, CheckCircle } from 'lucide-react'

// Clean Checkbox (16x16, compact)
function CleanSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center flex-shrink-0"
      style={{
        borderColor: checked ? '#E53935' : 'rgba(255, 255, 255, 0.3)',
        background: checked ? '#E53935' : 'transparent',
        borderWidth: '1.5px',
      }}
    >
      {checked && (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

// MD3 List Item Component
function ListItem({
  icon,
  label,
  description,
  trailing,
  onClick,
}: {
  icon?: React.ReactNode
  label: string
  description?: string
  trailing?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${onClick ? 'cursor-pointer active:bg-white/5' : ''}`}
      onClick={onClick}
    >
      {icon && (
        <div className="w-6 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          {label}
        </p>
        {description && (
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            {description}
          </p>
        )}
      </div>
      {trailing}
    </div>
  )
}

export default function NotificacionesTab() {
  const {
    isSupported,
    isInitializing,
    permission,
    requestPermission,
    pushSubscription,
    subscribeToPush,
    unsubscribeFromPush,
  } = useNotifications()

  const [saving, setSaving] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const handlePermissionRequest = async () => {
    setSaving(true)
    await requestPermission()
    setSaving(false)
  }

  const pushEnabled = Boolean(pushSubscription)

  const handleEnablePush = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    setPushLoading(true)
    try {
      await subscribeToPush(vapidKey)
    } catch (error) {
      console.error('Error enabling push notifications:', error)
    }
    setPushLoading(false)
  }

  const handleDisablePush = async () => {
    setPushLoading(true)
    await unsubscribeFromPush()
    setPushLoading(false)
  }

  if (isInitializing) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Preparando...</div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <BellOff className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--cp-on-surface-muted)' }} />
        <p className="font-medium" style={{ color: 'var(--cp-on-surface)' }}>
          No Disponible
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--cp-on-surface-muted)' }}>
          Tu navegador no soporta notificaciones
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* System Permission */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <ListItem
          icon={permission === 'granted' ? <CheckCircle className="w-5 h-5" style={{ color: '#22c55e' }} /> : <AlertTriangle className="w-5 h-5" style={{ color: '#f97316' }} />}
          label="Permiso del Sistema"
          description={permission === 'granted' ? 'Activado' : permission === 'denied' ? 'Bloqueado en ajustes' : 'Sin permiso'}
          trailing={
            permission !== 'granted' && (
              <button
                onClick={handlePermissionRequest}
                disabled={saving || permission === 'denied'}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: '#E53935',
                  color: 'white',
                  opacity: saving || permission === 'denied' ? 0.5 : 1,
                }}
              >
                {saving ? '...' : 'Activar'}
              </button>
            )
          }
        />
      </div>

      {/* Push Notifications */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <ListItem
          icon={<Bell className="w-5 h-5" style={{ color: pushEnabled ? '#22c55e' : 'var(--cp-on-surface-muted)' }} />}
          label="Notificaciones Push"
          description={pushEnabled ? 'Activas en segundo plano' : 'Recibe alertas con la app cerrada'}
          trailing={
            <CleanSwitch
              checked={pushEnabled}
              onChange={async (v) => {
                if (v) {
                  await handleEnablePush()
                } else {
                  await handleDisablePush()
                }
              }}
            />
          }
        />
        {permission !== 'granted' && !pushEnabled && (
          <p className="text-xs pl-9 -mt-1" style={{ color: '#f97316' }}>
            Primero activa el permiso del sistema
          </p>
        )}
      </div>
    </div>
  )
}
