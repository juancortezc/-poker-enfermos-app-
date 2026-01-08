'use client'

import { useState } from 'react'
import { User, Bell, Smartphone, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import CPBottomNav from '@/components/clean-poker/CPBottomNav'
import LoginForm from '@/components/LoginForm'
import DatosTab from '@/components/perfil/DatosTab'
import NotificacionesTab from '@/components/perfil/NotificacionesTab'
import AplicacionTab from '@/components/perfil/AplicacionTab'
import CerrarSesionTab from '@/components/perfil/CerrarSesionTab'

type TabType = 'datos' | 'notificaciones' | 'aplicacion' | 'cerrar-sesion'

const TABS = [
  { id: 'datos' as const, label: 'Datos', icon: <User className="w-4 h-4" /> },
  { id: 'notificaciones' as const, label: 'Alertas', icon: <Bell className="w-4 h-4" /> },
  { id: 'aplicacion' as const, label: 'App', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'cerrar-sesion' as const, label: 'Salir', icon: <LogOut className="w-4 h-4" /> },
]

export default function PerfilPage() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('datos')

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--cp-background)' }}
      >
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-3">
            <div
              className="absolute inset-0 rounded-full border-4"
              style={{ borderColor: 'var(--cp-surface-border)' }}
            />
            <div
              className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: '#E53935', borderTopColor: 'transparent' }}
            />
          </div>
          <p style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return <LoginForm />
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--cp-background)' }}
    >
      {/* Header with MD3 Navigation Pills */}
      <div
        className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: 'var(--cp-background)' }}
      >
        <h1
          className="text-lg font-bold text-center mb-3"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          Mi Perfil
        </h1>

        {/* MD3 Navigation Pills - Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                style={{
                  background: isActive ? 'rgba(229, 57, 53, 0.15)' : 'transparent',
                  color: isActive ? '#E53935' : 'var(--cp-on-surface-muted)',
                  border: isActive ? '1px solid rgba(229, 57, 53, 0.3)' : '1px solid transparent',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-2">
        {activeTab === 'datos' && <DatosTab />}
        {activeTab === 'notificaciones' && <NotificacionesTab />}
        {activeTab === 'aplicacion' && <AplicacionTab />}
        {activeTab === 'cerrar-sesion' && <CerrarSesionTab />}
      </div>

      {/* Bottom Navigation */}
      <CPBottomNav />
    </div>
  )
}
