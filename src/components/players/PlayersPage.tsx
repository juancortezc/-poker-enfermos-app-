'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePlayerSearch } from '@/contexts/PlayerSearchContext'
import { canCRUD } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import PlayerList from './PlayerList'
import PlayerForm from './PlayerForm'
import { buildAuthHeaders } from '@/lib/client-auth'

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

type TabType = 'enfermos' | 'invitados'

export default function PlayersPage() {
  const { user } = useAuth()
  const { searchTerm, setShowAddButton, setOnAddClick } = usePlayerSearch()
  const [activeTab, setActiveTab] = useState<TabType>('enfermos')
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  const canEdit = !!(user && canCRUD(user.role))

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

  // Cargar jugadores
  useEffect(() => {
    fetchPlayers()
  }, [])

  // Configurar header search
  useEffect(() => {
    setShowAddButton(canEdit)
    setOnAddClick(() => handleAddPlayer)
    
    return () => {
      setShowAddButton(false)
      setOnAddClick(null)
    }
  }, [canEdit, setShowAddButton, setOnAddClick])

  // Filtrar jugadores por tab activo
  useEffect(() => {
    const filtered = players.filter(player => {
      if (activeTab === 'enfermos') {
        return player.role === UserRole.Enfermo || player.role === UserRole.Comision
      } else {
        return player.role === UserRole.Invitado
      }
    })
    setFilteredPlayers(filtered)
  }, [players, activeTab])

  // Búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      const filtered = players.filter(player => {
        if (activeTab === 'enfermos') {
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
      const matchesTab = activeTab === 'enfermos' 
        ? (player.role === UserRole.Enfermo || player.role === UserRole.Comision)
        : player.role === UserRole.Invitado

      const matchesSearch = 
        player.firstName.toLowerCase().includes(searchLower) ||
        player.lastName.toLowerCase().includes(searchLower) ||
        player.aliases.some(alias => alias.toLowerCase().includes(searchLower))

      return matchesTab && matchesSearch
    })
    setFilteredPlayers(filtered)
  }, [players, activeTab, searchTerm])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center animate-enter">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-poker-card"></div>
            <div className="absolute inset-0 rounded-full border-4 border-poker-red border-t-transparent animate-spin"></div>
          </div>
          <p className="text-poker-muted">Cargando jugadores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex justify-center">
        <div className="flex space-x-0">
          <button
            onClick={() => setActiveTab('enfermos')}
            className={`px-6 py-3 font-semibold rounded-l-lg border border-r-0 transition-colors ${
              activeTab === 'enfermos'
                ? 'bg-poker-red text-white border-poker-red'
                : 'bg-black text-gray-300 border-white/10 hover:text-white'
            }`}
          >
            Enfermos ({enfermosCount})
          </button>
          <button
            onClick={() => setActiveTab('invitados')}
            className={`px-6 py-3 font-semibold rounded-r-lg border border-l-0 -ml-px transition-colors ${
              activeTab === 'invitados'
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-black text-gray-300 border-white/10 hover:text-white'
            }`}
          >
            Invitados ({invitadosCount})
          </button>
        </div>
      </div>

      {/* Players List */}
      <div>
        <PlayerList
          players={filteredPlayers}
          canEdit={canEdit}
          onEditPlayer={handleEditPlayer}
          activeTab={activeTab}
        />
      </div>
      {/* Player Form Modal */}
      {showForm && (
        <PlayerForm
          player={editingPlayer}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setEditingPlayer(null)
          }}
          onSave={handlePlayerUpdated}
          defaultRole={activeTab === 'enfermos' ? UserRole.Enfermo : UserRole.Invitado}
        />
      )}
    </div>
  )
}
