'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import CPBottomNav from '@/components/clean-poker/CPBottomNav'
import CPAppShell from '@/components/clean-poker/CPAppShell'
import LoginForm from '@/components/LoginForm'
import DatosTab from '@/components/perfil/DatosTab'
import NotificacionesTab from '@/components/perfil/NotificacionesTab'
import AplicacionTab from '@/components/perfil/AplicacionTab'
import CerrarSesionTab from '@/components/perfil/CerrarSesionTab'

type TabType = 'datos' | 'notificaciones' | 'aplicacion' | 'cerrar-sesion'

const TABS = [
  { id: 'datos' as const, label: 'Datos' },
  { id: 'notificaciones' as const, label: 'Alertas' },
  { id: 'aplicacion' as const, label: 'App' },
  { id: 'cerrar-sesion' as const, label: 'Salir' },
]

export default function PerfilPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('datos')

  // Loading state
  if (loading) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center">
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
      </CPAppShell>
    )
  }

  // Not authenticated
  if (!user) {
    return <LoginForm />
  }

  return (
    <CPAppShell>
      <div className="min-h-screen pb-24">
        {/* Header with Close Button */}
        <div
          className="sticky top-0 z-10 px-4 pt-4 pb-3"
          style={{ background: 'var(--cp-background)' }}
        >
        {/* Title with Close Button */}
        <div className="relative flex items-center justify-center mb-4">
          <h1
            className="text-lg font-bold"
            style={{ color: 'var(--cp-on-surface)' }}
          >
            Mi Perfil
          </h1>
          <button
            onClick={() => router.back()}
            className="absolute right-0 p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CleanTabs - Text with red underline */}
        <div className="flex justify-center gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="pb-2 transition-all duration-200 cursor-pointer"
              style={{
                fontSize: 'var(--cp-body-size)',
                fontWeight: activeTab === tab.id ? 700 : 400,
                color: activeTab === tab.id ? 'var(--cp-on-surface)' : 'var(--cp-on-surface-muted)',
                borderBottom: activeTab === tab.id ? '2px solid #E53935' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {activeTab === 'datos' && <DatosTab />}
        {activeTab === 'notificaciones' && <NotificacionesTab />}
        {activeTab === 'aplicacion' && <AplicacionTab />}
        {activeTab === 'cerrar-sesion' && <CerrarSesionTab />}
      </div>

        {/* Bottom Navigation */}
        <CPBottomNav />
      </div>
    </CPAppShell>
  )
}
