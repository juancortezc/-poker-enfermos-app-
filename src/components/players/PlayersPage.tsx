'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserRole } from '@prisma/client'
import { Search, Plus, Users, UserCheck } from 'lucide-react'
import PlayerList from './PlayerList'
import PlayerForm from './PlayerForm'

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
  const [activeTab, setActiveTab] = useState<TabType>('enfermos')
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  const canEdit = !!(user && canCRUD(user.role))

  // Cargar jugadores
  useEffect(() => {
    fetchPlayers()
  }, [])

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
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPlayers(data)
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
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-poker-text">Gestión de Jugadores</h1>
          <p className="text-poker-muted">
            {canEdit ? 'Administrar jugadores del grupo' : 'Ver jugadores del grupo'}
          </p>
        </div>
        {canEdit && (
          <Button 
            onClick={handleAddPlayer}
            className="bg-poker-red hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 animate-stagger animate-stagger-1">
        <Card className="bg-poker-card border-poker-green/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-poker-green/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-poker-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-poker-text">{enfermosCount}</p>
                <p className="text-sm text-poker-muted">Enfermos + Comisión</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-poker-card border-poker-cyan/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-poker-cyan/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-poker-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-poker-text">{invitadosCount}</p>
                <p className="text-sm text-poker-muted">Invitados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-poker-card rounded-lg p-1 animate-stagger animate-stagger-2">
        <button
          onClick={() => setActiveTab('enfermos')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-smooth ${
            activeTab === 'enfermos'
              ? 'bg-poker-red text-white shadow-lg'
              : 'text-poker-muted hover:text-poker-text'
          }`}
        >
          Enfermos ({enfermosCount})
        </button>
        <button
          onClick={() => setActiveTab('invitados')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-smooth ${
            activeTab === 'invitados'
              ? 'bg-poker-cyan text-poker-dark shadow-lg'
              : 'text-poker-muted hover:text-poker-text'
          }`}
        >
          Invitados ({invitadosCount})
        </button>
      </div>

      {/* Search */}
      <div className="relative animate-stagger animate-stagger-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-poker-muted w-4 h-4" />
        <Input
          type="text"
          placeholder="Buscar por nombre o alias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-poker-card border-white/10 text-poker-text placeholder:text-poker-muted focus:border-poker-red focus:ring-poker-red/30"
        />
      </div>

      {/* Players List */}
      <div className="animate-stagger animate-stagger-4">
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