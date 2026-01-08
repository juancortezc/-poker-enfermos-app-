'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'
import { Plus, Search, Loader2, Users } from 'lucide-react'
import Image from 'next/image'
import { buildAuthHeaders } from '@/lib/client-auth'
import CPPlayerForm from './CPPlayerForm'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  aliases: string[]
  pin?: string
  birthDate?: string
  phone?: string
  email?: string
  photoUrl?: string
  isActive: boolean
  inviter?: {
    id: string
    firstName: string
    lastName: string
  }
  _count?: {
    invitees: number
  }
}

type SubTabType = 'enfermos' | 'invitados'

const SUB_TABS = [
  { id: 'enfermos' as const, label: 'Enfermos' },
  { id: 'invitados' as const, label: 'Invitados' },
]

export default function CPJugadoresTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('enfermos')
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  const getRolePriority = (role: UserRole) => {
    switch (role) {
      case UserRole.Comision:
        return 0
      case UserRole.Enfermo:
        return 1
      default:
        return 2
    }
  }

  const dedupePlayers = (list: Player[]) => {
    const map = new Map<string, Player>()

    list.forEach(player => {
      const normalizedFirst = player.firstName.trim()
      const normalizedLast = player.lastName.trim()
      const key = `${normalizedFirst.toLowerCase()}|${normalizedLast.toLowerCase()}`
      const candidate: Player = {
        ...player,
        firstName: normalizedFirst,
        lastName: normalizedLast
      }

      const existing = map.get(key)

      if (!existing) {
        map.set(key, candidate)
        return
      }

      const existingPriority = getRolePriority(existing.role)
      const candidatePriority = getRolePriority(candidate.role)

      if (candidatePriority < existingPriority) {
        map.set(key, candidate)
      }
    })

    return Array.from(map.values())
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  // Filter players by tab
  useEffect(() => {
    const filtered = players.filter(player => {
      if (activeSubTab === 'enfermos') {
        return player.role === UserRole.Enfermo || player.role === UserRole.Comision
      } else {
        return player.role === UserRole.Invitado
      }
    })
    setFilteredPlayers(filtered)
  }, [players, activeSubTab])

  // Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      const filtered = players.filter(player => {
        if (activeSubTab === 'enfermos') {
          return player.role === UserRole.Enfermo || player.role === UserRole.Comision
        } else {
          return player.role === UserRole.Invitado
        }
      })
      setFilteredPlayers(filtered)
      return
    }

    const searchLower = searchTerm.toLowerCase()
    const filtered = players.filter(player => {
      const matchesTab = activeSubTab === 'enfermos'
        ? (player.role === UserRole.Enfermo || player.role === UserRole.Comision)
        : player.role === UserRole.Invitado

      const matchesSearch =
        player.firstName.toLowerCase().includes(searchLower) ||
        player.lastName.toLowerCase().includes(searchLower) ||
        player.aliases.some(alias => alias.toLowerCase().includes(searchLower))

      return matchesTab && matchesSearch
    })
    setFilteredPlayers(filtered)
  }, [players, activeSubTab, searchTerm])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/players?includeInactive=false', {
        headers: buildAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        const deduped = dedupePlayers(data)
        setPlayers(deduped)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerUpdated = () => {
    fetchPlayers()
    setShowForm(false)
    setEditingPlayer(null)
  }

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player)
    setShowForm(true)
  }

  const handleAddPlayer = () => {
    setEditingPlayer(null)
    setShowForm(true)
  }

  const enfermosCount = players.filter(p => p.role === UserRole.Enfermo || p.role === UserRole.Comision).length
  const invitadosCount = players.filter(p => p.role === UserRole.Invitado).length

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: 'var(--cp-surface-border)',
              borderTopColor: '#E53935'
            }}
          />
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Cargando jugadores...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row: Add button + Search */}
      <div className="flex items-center gap-3">
        {/* Add Button */}
        <button
          onClick={handleAddPlayer}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
          style={{ background: '#E53935' }}
        >
          <Plus size={20} style={{ color: 'white' }} />
        </button>

        {/* Search */}
        <div
          className="flex-1 rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Search size={16} style={{ color: 'var(--cp-on-surface-muted)' }} />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontSize: 'var(--cp-body-size)',
              color: 'var(--cp-on-surface)',
            }}
          />
        </div>
      </div>

      {/* CleanPoker Sub Tabs - text with red underline */}
      <div className="flex justify-center gap-8">
        {SUB_TABS.map((tab) => {
          const count = tab.id === 'enfermos' ? enfermosCount : invitadosCount
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className="pb-2 transition-all duration-200"
              style={{
                fontSize: 'var(--cp-body-size)',
                fontWeight: activeSubTab === tab.id ? 700 : 400,
                color: activeSubTab === tab.id ? 'var(--cp-on-surface)' : 'var(--cp-on-surface-muted)',
                borderBottom: activeSubTab === tab.id ? '2px solid #E53935' : '2px solid transparent',
              }}
            >
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Players List */}
      {filteredPlayers.length === 0 ? (
        <div className="py-8 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <p style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}>
            No hay {activeSubTab === 'enfermos' ? 'enfermos' : 'invitados'}
          </p>
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            {searchTerm ? 'Intenta con otro termino' : 'Toca + para agregar'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredPlayers.map((player) => {
            const isInvitado = player.role === UserRole.Invitado
            const shadowColor = isInvitado ? 'rgba(236, 64, 122, 0.4)' : 'rgba(229, 57, 53, 0.4)'
            return (
            <button
              key={player.id}
              onClick={() => handleEditPlayer(player)}
              className="w-full rounded-xl px-3 py-2.5 flex items-center gap-3 text-left transition-all duration-200 cursor-pointer group"
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 20px ${shadowColor}`
                e.currentTarget.style.borderColor = isInvitado ? 'rgba(236, 64, 122, 0.3)' : 'rgba(229, 57, 53, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
              }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{
                  background: player.photoUrl ? 'transparent' : 'var(--cp-surface-solid)',
                  border: `2px solid ${player.role === 'Comision' ? '#E53935' : player.role === 'Invitado' ? '#EC407A' : 'rgba(255, 255, 255, 0.1)'}`,
                }}
              >
                {player.photoUrl ? (
                  <Image
                    src={player.photoUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    width={36}
                    height={36}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--cp-on-surface-variant)',
                      fontWeight: 600,
                    }}
                  >
                    {getInitials(player.firstName, player.lastName)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-medium truncate"
                  style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
                >
                  {player.firstName} {player.lastName}
                </p>
                <p
                  className="truncate"
                  style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
                >
                  {player.role === 'Comision' && 'Comision'}
                  {player.role === 'Enfermo' && 'Enfermo'}
                  {player.role === 'Invitado' && player.inviter && `Invitado de ${player.inviter.firstName}`}
                </p>
              </div>

              {/* Badge for Comision */}
              {player.role === 'Comision' && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                  style={{ background: 'rgba(229, 57, 53, 0.2)', color: '#E53935' }}
                >
                  C
                </span>
              )}
            </button>
            )
          })}
        </div>
      )}

      {/* Player Form Modal */}
      {showForm && (
        <CPPlayerForm
          player={editingPlayer}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setEditingPlayer(null)
          }}
          onSave={handlePlayerUpdated}
          defaultRole={activeSubTab === 'enfermos' ? UserRole.Enfermo : UserRole.Invitado}
        />
      )}
    </div>
  )
}
