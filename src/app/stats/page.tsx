'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
import CPTorneosTab from '@/components/stats/CPTorneosTab'
import CPCampeonesTab from '@/components/stats/CPCampeonesTab'
import CPPodiosTab from '@/components/stats/CPPodiosTab'
import SinGanarTab from '@/components/stats/SinGanarTab'

type TabType = 'torneos' | 'campeones' | 'podios' | 'sin-ganar'

const TABS = [
  { id: 'sin-ganar' as const, label: 'Sin Ganar' },
  { id: 'torneos' as const, label: 'Torneos' },
  { id: 'campeones' as const, label: 'Campeonatos' },
  { id: 'podios' as const, label: 'Podios' },
]

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('sin-ganar')

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
  } = useActiveTournament({ refreshInterval: 300000 })

  const { hasActiveGameDate } = useActiveGameDate()

  // Loading state
  if (authLoading || tournamentLoading) {
    return <CPPageSkeleton blocks={[44, 220, 220]} />
  }

  // Not authenticated
  if (!user) {
    return (
      <CPAppShell tone="light">
        <div className="min-h-screen flex flex-col">
        <CPHeader tone="light"
          userInitials="?"
          tournamentNumber={29}
        />
        <main className="flex-1 flex items-center justify-center px-4">
          <div
            className="rounded-2xl p-6 text-center max-w-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
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
              Debes iniciar sesion para ver las estadisticas.
            </p>
          </div>
        </main>
        <CPBottomNav tone="light" />
        </div>
      </CPAppShell>
    )
  }

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'
  const tournamentNumber = activeTournament?.number ?? 29
  const isComision = user.role === 'Comision'

  return (
    <CPAppShell tone="light">
      {/* Header */}
      <CPHeader tone="light"
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isComision}
        hasActiveGameDate={hasActiveGameDate}
      />

      {/* Content */}
      <main className="pb-20 px-4 space-y-4">
        {/* Tab Navigation — los mismos chips que /fecha y /ranking */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TABS.map((tab) => {
            const activo = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activo}
                className="shrink-0 cursor-pointer"
                style={{
                  fontFamily: 'var(--cp-font-display)',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: activo ? '#fff' : 'var(--cp-on-surface-muted)',
                  background: activo ? '#C62828' : 'var(--cp-surface-2)',
                  border: 'none',
                  borderRadius: 100,
                  padding: '9px 16px',
                  transition: 'background 180ms ease, color 180ms ease',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'torneos' && <CPTorneosTab />}
        {activeTab === 'campeones' && <CPCampeonesTab />}
        {activeTab === 'podios' && <CPPodiosTab />}
        {activeTab === 'sin-ganar' && <SinGanarTab tournamentId={activeTournament?.id} />}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
