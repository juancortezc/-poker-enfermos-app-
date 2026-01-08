'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import CalendarioTab from '@/components/info/CalendarioTab'
import ReglamentoTab from '@/components/info/ReglamentoTab'
import EnfermosTab from '@/components/info/EnfermosTab'

type TabType = 'calendario' | 'reglamento' | 'enfermos'

const TABS = [
  { id: 'calendario' as const, label: 'Calendario' },
  { id: 'reglamento' as const, label: 'Reglamento' },
  { id: 'enfermos' as const, label: 'Enfermos' },
]

export default function InfoPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('calendario')

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
  } = useActiveTournament({ refreshInterval: 300000 })

  // Loading state
  if (authLoading || tournamentLoading) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: 'var(--cp-surface-border)',
              borderTopColor: 'var(--cp-primary)'
            }}
          />
          <p
            style={{
              fontSize: 'var(--cp-body-size)',
              color: 'var(--cp-on-surface-variant)'
            }}
          >
            Cargando informacion...
          </p>
        </div>
        </div>
      </CPAppShell>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex flex-col">
        <CPHeader
          userInitials="?"
          tournamentNumber={29}
        />
        <main className="flex-1 flex items-center justify-center px-4">
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
              Acceso no autorizado
            </p>
            <p
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-muted)',
              }}
            >
              Debes iniciar sesion para ver la informacion.
            </p>
          </div>
        </main>
        <CPBottomNav />
        </div>
      </CPAppShell>
    )
  }

  const userInitials = user.firstName?.slice(0, 2).toUpperCase() || 'PE'
  const tournamentNumber = activeTournament?.number ?? 29
  const isComision = user.role === 'Comision'

  return (
    <CPAppShell>
      {/* Header */}
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isComision}
      />

      {/* Content */}
      <main className="pb-20 px-4 space-y-4">
        {/* Tab Navigation */}
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

        {/* Tab Content */}
        {activeTab === 'calendario' && <CalendarioTab />}
        {activeTab === 'reglamento' && <ReglamentoTab />}
        {activeTab === 'enfermos' && <EnfermosTab />}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav />
    </CPAppShell>
  )
}
