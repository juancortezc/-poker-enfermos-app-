'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPRankingView } from '@/components/clean-poker/CPRankingView'

import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'

export default function RankingPage() {
  const { user, loading: authLoading } = useAuth()

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
    isNotFound
  } = useActiveTournament({ refreshInterval: 300000 }) // 5 minutes

  const { hasActiveGameDate } = useActiveGameDate()

  // Loading state
  if (authLoading || tournamentLoading) {
    return <CPPageSkeleton blocks={[140, 80, 44, 420]} />
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
          <CPBottomNav tone="light" />
        </div>
      </CPAppShell>
    )
  }

  // No active tournament
  if (!activeTournament) {
    return (
      <CPAppShell tone="light">
        <div className="min-h-screen flex flex-col">
          <CPHeader tone="light"
            userInitials={user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'PE'}
            userPhotoUrl={user.photoUrl}
            tournamentNumber={29}
          />
          <main className="flex-1 flex items-center justify-center px-4">
            <div
              className="rounded-2xl p-6 text-center max-w-sm"
              style={{
                background: 'var(--cp-surface)',
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
          <CPBottomNav tone="light" />
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
      <main className="pb-20 px-4">
        <CPRankingView tournamentId={activeTournament.id} tournamentNumber={tournamentNumber} currentUserId={user.id} />
      </main>

      {/* Bottom Nav */}
      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
