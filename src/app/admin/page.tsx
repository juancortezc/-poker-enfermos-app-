'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { Play, Trophy, Coins, Users, Gift, Gavel } from 'lucide-react'
import CPBottomNav from '@/components/clean-poker/CPBottomNav'
import CPAppShell from '@/components/clean-poker/CPAppShell'
import CPHeader from '@/components/clean-poker/CPHeader'
import LoginForm from '@/components/LoginForm'
import CPActivarTab from '@/components/admin/CPActivarTab'
import CPCrearTorneoTab from '@/components/admin/CPCrearTorneoTab'
import CPJugadoresTab from '@/components/admin/CPJugadoresTab'
import CPPremiacionTab from '@/components/admin/CPPremiacionTab'
import CPBlindsTab from '@/components/admin/CPBlindsTab'
import CPMultasTab from '@/components/admin/CPMultasTab'

type TabType = 'activar' | 'torneo' | 'blinds' | 'jugadores' | 'premiacion' | 'multas'

const TABS = [
  { id: 'activar' as const, label: 'Activar', icon: Play },
  { id: 'torneo' as const, label: 'Torneo', icon: Trophy },
  { id: 'blinds' as const, label: 'Blinds', icon: Coins },
  { id: 'jugadores' as const, label: 'Enfermos', icon: Users },
  { id: 'premiacion' as const, label: 'Premios', icon: Gift },
  { id: 'multas' as const, label: 'Multas', icon: Gavel },
]

export default function AdminNewPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('activar')

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

          {/* Icon tabs */}
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center gap-1 shrink-0 transition-all duration-200 cursor-pointer"
                  style={{
                    minWidth: 64,
                    padding: '10px 8px',
                    borderRadius: 14,
                    background: active ? '#E53935' : 'var(--cp-surface)',
                    border: `1px solid ${active ? '#E53935' : 'var(--cp-surface-border)'}`,
                  }}
                >
                  <Icon size={18} color={active ? '#fff' : 'var(--cp-on-surface-muted)'} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#fff' : 'var(--cp-on-surface-muted)',
                    }}
                  >
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-4">
          {activeTab === 'activar' && <CPActivarTab />}
          {activeTab === 'torneo' && <CPCrearTorneoTab />}
          {activeTab === 'blinds' && <CPBlindsTab tournamentId={activeTournament?.id} />}
          {activeTab === 'jugadores' && <CPJugadoresTab />}
          {activeTab === 'premiacion' && <CPPremiacionTab tournamentId={activeTournament?.id} />}
          {activeTab === 'multas' && <CPMultasTab tournamentId={activeTournament?.id} />}
        </div>

        {/* Bottom Navigation */}
        <CPBottomNav />
      </div>
    </CPAppShell>
  )
}
