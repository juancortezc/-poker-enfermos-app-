'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import useSWR from 'swr'
import { Search, Phone, Mail, Cake, Users } from 'lucide-react'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { HomeCard } from '@/components/clean-poker/HomeCard'
import { HomeAvatar } from '@/components/clean-poker/HomeAvatar'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: string
  aliases: string[]
  photoUrl?: string | null
  isActive: boolean
  email?: string | null
  phone?: string | null
  birthDate?: string | null
}

function formatBirthday(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null
  try {
    const dateOnly = birthDate.split('T')[0]
    const date = new Date(dateOnly + 'T12:00:00')
    const day = date.getDate()
    const month = date.toLocaleDateString('es-ES', { month: 'short' })
    return `${day} ${month}`
  } catch {
    return null
  }
}

export default function ContactosPage() {
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()
  const [search, setSearch] = useState('')

  const { data: players } = useSWR<Player[]>('/api/players?includeInactive=false', { revalidateOnFocus: false })

  const filteredContacts = useMemo(() => {
    if (!players) return []
    const term = search.trim().toLowerCase()
    return players
      .filter((p) => (p.role === 'Enfermo' || p.role === 'Comision') && p.isActive)
      .filter((p) => {
        if (!term) return true
        return (
          p.firstName.toLowerCase().includes(term) ||
          p.lastName.toLowerCase().includes(term) ||
          p.aliases.some((a) => a.toLowerCase().includes(term))
        )
      })
      .sort((a, b) => {
        if (user?.id === a.id) return -1
        if (user?.id === b.id) return 1
        return a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' })
      })
  }, [players, search, user?.id])

  const totalContacts = players
    ? players.filter((p) => (p.role === 'Enfermo' || p.role === 'Comision') && p.isActive).length
    : null

  const isLoading = authLoading || tournamentLoading || !user

  if (isLoading) {
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

  const userInitials = user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'PE'
  const tournamentNumber = activeTournament?.number ?? 29
  const isComision = user.role === 'Comision'

  return (
    <CPAppShell>
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isComision}
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-24 px-4 pt-4 space-y-4">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Users size={20} color="#E53935" />
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F5EFE6', letterSpacing: '-0.01em' }}>Contactos</div>
          {totalContacts !== null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7A6E62' }}>{totalContacts}</span>
          )}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7A6E62' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2.5"
            style={{
              background: '#2A292B',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#F5EFE6',
              fontSize: 13,
              borderRadius: 100,
            }}
          />
        </div>

        {!players ? (
          <div className="flex justify-center py-8">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#E53935' }}
            />
          </div>
        ) : filteredContacts.length === 0 ? (
          <HomeCard>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#B5A996' }}>No se encontraron jugadores.</p>
            </div>
          </HomeCard>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((player) => {
              const birthday = formatBirthday(player.birthDate)
              const isCurrentUser = user.id === player.id
              return (
                <HomeCard key={player.id}>
                  <div style={{ padding: 12, display: 'flex', gap: 12 }}>
                    <HomeAvatar playerId={player.id} name={`${player.firstName} ${player.lastName}`} photoUrl={player.photoUrl} size={52} fontSize={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#F5EFE6' }}>
                          {player.firstName} {player.lastName}
                          {isCurrentUser && <span style={{ color: '#7A6E62', fontWeight: 600 }}> (Tú)</span>}
                        </span>
                        {player.role === 'Comision' && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: '#E53935',
                              background: 'rgba(229,57,53,0.16)',
                              borderRadius: '50%',
                              width: 16,
                              height: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            C
                          </span>
                        )}
                      </div>

                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {player.phone && (
                          <a href={`tel:${player.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={11} style={{ color: '#7A6E62', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#B5A996' }}>{player.phone}</span>
                          </a>
                        )}
                        {player.email && (
                          <a href={`mailto:${player.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <Mail size={11} style={{ color: '#7A6E62', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#B5A996', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {player.email}
                            </span>
                          </a>
                        )}
                        {birthday && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Cake size={11} style={{ color: '#7A6E62', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#B5A996' }}>{birthday}</span>
                          </div>
                        )}
                        {!player.phone && !player.email && !birthday && (
                          <span style={{ fontSize: 11, color: '#7A6E62' }}>Sin datos de contacto</span>
                        )}
                      </div>
                    </div>
                  </div>
                </HomeCard>
              )
            })}
          </div>
        )}
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}
