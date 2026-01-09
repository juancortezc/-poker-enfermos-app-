'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { CPRankingView } from '@/components/clean-poker/CPRankingView'

import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'

export default function RankingPage() {
  const { user, loading: authLoading } = useAuth()

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
    isNotFound
  } = useActiveTournament({ refreshInterval: 300000 }) // 5 minutes

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
              Cargando ranking...
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
                Debes iniciar sesion para ver el ranking completo.
              </p>
            </div>
          </main>
          <CPBottomNav />
        </div>
      </CPAppShell>
    )
  }

  // No active tournament
  if (!activeTournament) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex flex-col">
          <CPHeader
            userInitials={user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'PE'}
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
                  ? 'El ranking se mostrara cuando inicie un nuevo torneo.'
                  : 'Verifica tu conexion e intenta de nuevo.'}
              </p>
            </div>
          </main>
          <CPBottomNav />
        </div>
      </CPAppShell>
    )
  }

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'
  const tournamentNumber = activeTournament.number ?? 29
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
      <main className="pb-20 px-4">
        <CPRankingView tournamentId={activeTournament.id} />
      </main>

      {/* Bottom Nav */}
      <CPBottomNav />
    </CPAppShell>
  )
}
