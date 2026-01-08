'use client'

import { useState } from 'react'
import { useNotifications, type NotificationPreferences } from '@/hooks/useNotifications'
import {
  Bell,
  BellOff,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  ChevronRight
} from 'lucide-react'

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

// MD3 Section Card
function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--cp-surface-border)' }}
      >
        <span style={{ color: '#E53935' }}>{icon}</span>
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          {title}
        </span>
      </div>
      <div className="px-4 divide-y" style={{ borderColor: 'var(--cp-surface-border)' }}>
        {children}
      </div>
    </div>
  )
}

export default function NotificacionesTab() {
  const {
    isSupported,
    isInitializing,
    permission,
    preferences,
    requestPermission,
    savePreferences,
    playSound,
    vibrate,
    notifyTimerWarning,
    notifyBlindChange,
    notifyPlayerEliminated,
    notifyWinner,
    pushSubscription,
    subscribeToPush,
    unsubscribeFromPush,
  } = useNotifications()

  const [saving, setSaving] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const handlePreferenceChange = (
    category: keyof NotificationPreferences,
    key: string,
    value: boolean | number | string
  ) => {
    const newPreferences = {
      ...preferences,
      [category]: {
        ...preferences[category],
        [key]: value,
      },
    }
    savePreferences(newPreferences)
  }

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

      {/* Timer Settings */}
      <SectionCard title="Timer" icon={<Timer className="w-4 h-4" />}>
        <ListItem
          label="Aviso 1 minuto antes"
          trailing={
            <CleanSwitch
              checked={preferences.timer.oneMinuteWarning}
              onChange={(v) => handlePreferenceChange('timer', 'oneMinuteWarning', v)}
            />
          }
        />
        <ListItem
          label="Cambio de blinds"
          trailing={
            <CleanSwitch
              checked={preferences.timer.blindChange}
              onChange={(v) => handlePreferenceChange('timer', 'blindChange', v)}
            />
          }
        />
        <ListItem
          label="Timer pausado"
          trailing={
            <CleanSwitch
              checked={preferences.timer.timerPaused}
              onChange={(v) => handlePreferenceChange('timer', 'timerPaused', v)}
            />
          }
        />
      </SectionCard>

      {/* Game Events */}
      <SectionCard title="Eventos" icon={<Trophy className="w-4 h-4" />}>
        <ListItem
          label="Jugador eliminado"
          trailing={
            <CleanSwitch
              checked={preferences.game.playerEliminated}
              onChange={(v) => handlePreferenceChange('game', 'playerEliminated', v)}
            />
          }
        />
        <ListItem
          label="Ganador declarado"
          trailing={
            <CleanSwitch
              checked={preferences.game.winnerDeclared}
              onChange={(v) => handlePreferenceChange('game', 'winnerDeclared', v)}
            />
          }
        />
      </SectionCard>

      {/* Sound */}
      <SectionCard
        title="Sonido"
        icon={preferences.sound.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      >
        <ListItem
          label="Sonidos"
          trailing={
            <CleanSwitch
              checked={preferences.sound.enabled}
              onChange={(v) => handlePreferenceChange('sound', 'enabled', v)}
            />
          }
        />
        {preferences.sound.enabled && (
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: 'var(--cp-on-surface)' }}>
                Volumen
              </span>
              <span className="text-xs" style={{ color: 'var(--cp-on-surface-muted)' }}>
                {preferences.sound.volume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.sound.volume}
              onChange={(e) => handlePreferenceChange('sound', 'volume', parseInt(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #E53935 0%, #E53935 ${preferences.sound.volume}%, var(--cp-surface-border) ${preferences.sound.volume}%, var(--cp-surface-border) 100%)`,
              }}
            />
            <button
              onClick={() => playSound('warning.mp3')}
              className="mt-2 text-xs font-medium"
              style={{ color: '#E53935' }}
            >
              Probar sonido
            </button>
          </div>
        )}
      </SectionCard>

      {/* Vibration */}
      <SectionCard title="Vibración" icon={<Smartphone className="w-4 h-4" />}>
        <ListItem
          label="Vibración"
          trailing={
            <CleanSwitch
              checked={preferences.vibration.enabled}
              onChange={(v) => handlePreferenceChange('vibration', 'enabled', v)}
            />
          }
        />
        {preferences.vibration.enabled && (
          <div className="py-3">
            {/* CleanTabs style - text with red underline */}
            <div className="flex justify-center gap-6">
              {(['light', 'medium', 'heavy'] as const).map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => handlePreferenceChange('vibration', 'intensity', intensity)}
                  className="pb-2 transition-all duration-200 cursor-pointer"
                  style={{
                    fontSize: 'var(--cp-body-size)',
                    fontWeight: preferences.vibration.intensity === intensity ? 700 : 400,
                    color: preferences.vibration.intensity === intensity ? 'var(--cp-on-surface)' : 'var(--cp-on-surface-muted)',
                    borderBottom: preferences.vibration.intensity === intensity ? '2px solid #E53935' : '2px solid transparent',
                  }}
                >
                  {intensity === 'light' ? 'Suave' : intensity === 'medium' ? 'Media' : 'Fuerte'}
                </button>
              ))}
            </div>
            <button
              onClick={() => vibrate()}
              className="mt-3 text-xs font-medium block mx-auto"
              style={{ color: '#E53935' }}
            >
              Probar vibración
            </button>
          </div>
        )}
      </SectionCard>

      {/* Test Section */}
      {permission === 'granted' && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--cp-on-surface-muted)' }}>
            Probar notificaciones
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Timer', action: () => notifyTimerWarning() },
              { label: 'Blinds', action: () => notifyBlindChange(5, 200, 400) },
              { label: 'Eliminación', action: () => notifyPlayerEliminated('Test', 10) },
              { label: 'Ganador', action: () => notifyWinner('Test', 25) },
            ].map((test) => (
              <button
                key={test.label}
                onClick={test.action}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'var(--cp-background)',
                  border: '1px solid var(--cp-surface-border)',
                  color: 'var(--cp-on-surface)',
                }}
              >
                {test.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
