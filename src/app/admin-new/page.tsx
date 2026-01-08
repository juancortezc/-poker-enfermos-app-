'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import CPBottomNav from '@/components/clean-poker/CPBottomNav'
import CPAppShell from '@/components/clean-poker/CPAppShell'
import CPHeader from '@/components/clean-poker/CPHeader'
import LoginForm from '@/components/LoginForm'
import CPCrearTorneoTab from '@/components/admin/CPCrearTorneoTab'
import CPJugadoresTab from '@/components/admin/CPJugadoresTab'
import CPPremiacionTab from '@/components/admin/CPPremiacionTab'

type TabType = 'torneo' | 'jugadores' | 'premiacion'

const TABS = [
  { id: 'torneo' as const, label: 'Torneo' },
  { id: 'jugadores' as const, label: 'Jugadores' },
  { id: 'premiacion' as const, label: 'Premiacion' },
]

export default function AdminNewPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('torneo')

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
  } = useActiveTournament({ refreshInterval: 300000 })

  // Check if user has permission (Comision only)
  useEffect(() => {
    if (!loading && user && user.role !== 'Comision') {
      router.replace('/')
    }
  }, [user, loading, router])

  // Loading state
  if (loading || tournamentLoading) {
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

  // Not authorized (not Comision)
  if (user.role !== 'Comision') {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div
            className="rounded-2xl p-6 text-center max-w-sm"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <p
              className="mb-2"
              style={{
                fontSize: 'var(--cp-body-size)',
                color: 'var(--cp-on-surface)',
              }}
            >
              Acceso restringido
            </p>
            <p
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-muted)',
              }}
            >
              Solo miembros de la Comision pueden acceder a esta seccion.
            </p>
          </div>
        </div>
      </CPAppShell>
    )
  }

  const tournamentNumber = activeTournament?.number ?? 29
  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : 'PE'

  return (
    <CPAppShell>
      <div className="min-h-screen pb-24">
        {/* CPHeader */}
        <CPHeader
          userInitials={userInitials}
          userPhotoUrl={user.photoUrl}
          tournamentNumber={tournamentNumber}
          isComision={true}
        />

        {/* Admin Tabs Section */}
        <div
          className="sticky top-0 z-10 px-4 pt-3 pb-3"
          style={{ background: 'var(--cp-background)' }}
        >
          {/* Admin Title */}
          <p
            className="text-center mb-3"
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Configuracion
          </p>

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
          {activeTab === 'torneo' && <CPCrearTorneoTab />}
          {activeTab === 'jugadores' && <CPJugadoresTab />}
          {activeTab === 'premiacion' && <CPPremiacionTab tournamentId={activeTournament?.id} />}
        </div>

        {/* Bottom Navigation */}
        <CPBottomNav />
      </div>
    </CPAppShell>
  )
}
