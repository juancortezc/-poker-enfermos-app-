'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import PodcastTab from '@/components/info/PodcastTab'

export default function PodcastPage() {
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()

  if (authLoading || tournamentLoading) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--cp-surface-border)', borderTopColor: 'var(--cp-primary)' }}
          />
        </div>
      </CPAppShell>
    )
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'

  return (
    <CPAppShell>
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user?.photoUrl}
        tournamentNumber={activeTournament?.number ?? 29}
        isComision={user?.role === 'Comision'}
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-20 px-4 pt-4 space-y-4">
        <PodcastTab />
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}
