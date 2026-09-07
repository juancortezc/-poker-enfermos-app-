'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { HomeCard } from '@/components/clean-poker/HomeCard'
import { Table2, BookOpen, User, Settings, ChevronRight, Calendar, Shield, Trophy } from 'lucide-react'

// Placeholder consciente: menú mínimo mientras se termina de diseñar esta
// sección. Reúne lo que antes vivía directo en la barra de navegación.
export default function MasPage() {
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
  const isComision = user?.role === 'Comision'

  const items = [
    { href: '/ranking', label: 'Clasificación', icon: Trophy },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
    { href: '/tabla', label: 'Tabla', icon: Table2 },
    { href: '/info', label: 'Reglamento e info', icon: BookOpen },
    { href: user ? `/players/${user.id}` : '/perfil', label: 'Mi perfil', icon: User },
    { href: '/perfil', label: 'Ajustes', icon: Settings },
    ...(isComision ? [{ href: '/admin', label: 'Administración', icon: Shield }] : [])
  ]

  return (
    <CPAppShell>
      <CPHeader
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
                style={{ borderBottom: index < items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : undefined }}
              >
                <Icon size={18} style={{ color: '#A89A8C' }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#F5EFE6' }}>{item.label}</span>
                <ChevronRight size={16} style={{ color: '#7A6E62' }} />
              </Link>
            )
          })}
        </HomeCard>
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}
