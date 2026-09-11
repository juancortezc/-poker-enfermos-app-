'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
import PodcastTab from '@/components/info/PodcastTab'

export default function PodcastPage() {
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()

  if (authLoading || tournamentLoading) {
    return <CPPageSkeleton blocks={[120, 200, 200]} />
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'

  return (
    <CPAppShell tone="light">
      <CPHeader tone="light"
        userInitials={userInitials}
        userPhotoUrl={user?.photoUrl}
        tournamentNumber={activeTournament?.number ?? 29}
        isComision={user?.role === 'Comision'}
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-20 px-4 pt-4 space-y-4">
        <PodcastTab />
      </main>

      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
