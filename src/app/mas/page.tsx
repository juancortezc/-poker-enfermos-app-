'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
import { HomeCard } from '@/components/clean-poker/HomeCard'
import { BookOpen, User, Settings, ChevronRight, Calendar, Shield, Trophy, Users, Receipt, FileSpreadsheet } from 'lucide-react'

// Placeholder consciente: menú mínimo mientras se termina de diseñar esta
// sección. Reúne lo que antes vivía directo en la barra de navegación.
export default function MasPage() {
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()

  if (authLoading || tournamentLoading) {
    return <CPPageSkeleton blocks={[56, 360]} />
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'
  const isComision = user?.role === 'Comision'

  const items = [
    { href: '/ranking', label: 'Tabla del torneo', icon: Trophy },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
    { href: '/contactos', label: 'Contactos', icon: Users },
    { href: '/multas', label: 'Multas', icon: Receipt },
    { href: '/info', label: 'Reglamento e info', icon: BookOpen },
    { href: user ? `/players/${user.id}` : '/perfil', label: 'Mi perfil', icon: User },
    { href: '/perfil', label: 'Ajustes', icon: Settings },
    ...(isComision ? [
      { href: '/admin', label: 'Administración', icon: Shield },
      { href: '/reportes', label: 'Reportes', icon: FileSpreadsheet }
    ] : [])
  ]

  return (
    <CPAppShell tone="light">
      <CPHeader tone="light"
        userInitials={userInitials}
        userPhotoUrl={user?.photoUrl}
        tournamentNumber={activeTournament?.number ?? 29}
        isComision={isComision}
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-20 px-4 pt-4">
        <HomeCard style={{ padding: 8 }}>
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-3"
                style={{ borderBottom: index < items.length - 1 ? '1px solid var(--cp-surface-border)' : undefined }}
              >
                <Icon size={18} style={{ color: 'var(--cp-on-surface-variant)' }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--cp-on-surface)' }}>{item.label}</span>
                <ChevronRight size={16} style={{ color: 'var(--cp-on-surface-variant)' }} />
              </Link>
            )
          })}
        </HomeCard>
      </main>

      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
