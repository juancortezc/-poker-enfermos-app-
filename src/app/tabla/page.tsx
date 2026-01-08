'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import ResumenTable from '@/components/tables/ResumenTable'
import TotalTable from '@/components/tables/TotalTable'
import FechasTable from '@/components/tables/FechasTable'
import ResultadosTable from '@/components/tables/ResultadosTable'

import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'

type TabType = 'resumen' | 'total' | 'fechas' | 'resultados'

const TABS = [
  { id: 'resumen' as const, label: 'Resumen' },
  { id: 'total' as const, label: 'Por Fecha' },
  { id: 'fechas' as const, label: 'Eliminados' },
  { id: 'resultados' as const, label: 'Resultados' },
]

export default function TablaPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('resumen')

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
    isNotFound
  } = useActiveTournament({ refreshInterval: 300000 }) // 5 minutes

  // Loading state
  if (authLoading || tournamentLoading) {
    return (
      <div
        className="cp-app min-h-screen flex items-center justify-center"
        style={{ background: 'var(--cp-background)' }}
      >
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
            Cargando tabla...
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div
        className="cp-app min-h-screen flex flex-col"
        style={{ background: 'var(--cp-background)' }}
      >
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
              Debes iniciar sesion para ver la tabla completa.
            </p>
          </div>
        </main>
        <CPBottomNav />
      </div>
    )
  }

  // No active tournament
  if (!activeTournament) {
    return (
      <div
        className="cp-app min-h-screen flex flex-col"
        style={{ background: 'var(--cp-background)' }}
      >
        <CPHeader
          userInitials={user.firstName?.slice(0, 2).toUpperCase() || 'PE'}
          userPhotoUrl={user.photoUrl}
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
              {isNotFound ? 'No hay torneo activo' : 'Error al cargar'}
            </p>
            <p
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-muted)',
              }}
            >
              {isNotFound
                ? 'La tabla se mostrara cuando inicie un nuevo torneo.'
                : 'Verifica tu conexion e intenta de nuevo.'}
            </p>
          </div>
        </main>
        <CPBottomNav />
      </div>
    )
  }

  const userInitials = user.firstName?.slice(0, 2).toUpperCase() || 'PE'
  const tournamentNumber = activeTournament.number ?? 29

  return (
    <div
      className="cp-app min-h-screen"
      style={{ background: 'var(--cp-background)' }}
    >
      {/* Header */}
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
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

        {/* Table Container - white background for tables, transparent for CleanPoker tabs */}
        {(activeTab === 'resumen' || activeTab === 'total') && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {activeTab === 'resumen' && (
              <ResumenTable
                tournamentId={activeTournament.id}
                userPin={user?.pin}
              />
            )}

            {activeTab === 'total' && (
              <TotalTable
                tournamentId={activeTournament.id}
                userPin={user?.pin}
              />
            )}
          </div>
        )}

        {activeTab === 'fechas' && (
          <FechasTable
            tournamentId={activeTournament.id}
            userPin={user?.pin}
          />
        )}

        {activeTab === 'resultados' && (
          <ResultadosTable
            tournamentId={activeTournament.id}
            userPin={user?.pin}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav />
    </div>
  )
}
