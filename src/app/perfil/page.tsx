'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import CPBottomNav from '@/components/clean-poker/CPBottomNav'
import CPAppShell from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
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

  // Permite entrar directo a una pestana con ?tab=notificaciones, que es como
  // el banner de push manda al instructivo de iPhone. Se lee de window en vez
  // de useSearchParams para no obligar a un Suspense en una pagina estatica.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (requested && TABS.some((t) => t.id === requested)) {
      setActiveTab(requested as TabType)
    }
  }, [])

  // Loading state
  if (loading) {
    return <CPPageSkeleton blocks={[44, 200, 200]} />
  }

  // Not authenticated
  if (!user) {
    return <LoginForm />
  }

  return (
    <CPAppShell tone="light">
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
        <CPBottomNav tone="light" />
      </div>
    </CPAppShell>
  )
}
