'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProposalForm } from '@/components/proposals/ProposalForm'
import { ProposalCard } from '@/components/proposals/ProposalCard'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import {
  Plus,
  Settings,
  Search,
  Filter,
  Eye,
  EyeOff,
  Users,
  AlertTriangle
} from 'lucide-react'

interface ProposalV2 {
  id: number
  title: string
  objective: string
  situation: string
  proposal: string
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
  createdBy?: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
}

type FilterType = 'all' | 'active' | 'inactive'

export default function AdminPropuestasPage() {
  const { user, loading } = useAuth()
  const [proposals, setProposals] = useState<ProposalV2[]>([])
  const [filteredProposals, setFilteredProposals] = useState<ProposalV2[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProposal, setEditingProposal] = useState<ProposalV2 | null>(null)
  const [expandedProposal, setExpandedProposal] = useState<number | null>(null)

  // Filter state
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Check if user is commission
  const isCommission = user?.role === 'Comision'

  useEffect(() => {
    if (user && isCommission) {
      fetchAllProposals()
    }
  }, [user, isCommission])

  useEffect(() => {
    applyFilters()
  }, [proposals, filter, searchTerm])

  const fetchAllProposals = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const url = new URL('/api/proposals-v2/admin', window.location.origin)
      url.searchParams.set('includeInactive', 'true')

      const response = await fetch(url.toString(), {
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Error al cargar propuestas')
      }

      const data = await response.json()
      setProposals(data.proposals || [])
    } catch (error) {
      console.error('Error fetching admin proposals:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar propuestas')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...proposals]

    // Apply status filter
    if (filter === 'active') {
      filtered = filtered.filter(p => p.isActive)
    } else if (filter === 'inactive') {
      filtered = filtered.filter(p => !p.isActive)
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.objective.toLowerCase().includes(term) ||
        p.situation.toLowerCase().includes(term) ||
        p.proposal.toLowerCase().includes(term) ||
        (p.createdBy?.firstName.toLowerCase().includes(term)) ||
        (p.createdBy?.lastName.toLowerCase().includes(term))
      )
    }

    setFilteredProposals(filtered)
  }

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    fetchAllProposals()
  }

  const handleEditSuccess = () => {
    setEditingProposal(null)
    fetchAllProposals()
  }

  const handleEdit = (proposal: ProposalV2) => {
    setEditingProposal(proposal)
    setShowCreateForm(false)
  }

  const handleCancelEdit = () => {
    setEditingProposal(null)
  }

  const handleToggleExpand = (proposalId: number) => {
    setExpandedProposal(expandedProposal === proposalId ? null : proposalId)
  }

  const getFilterStats = () => {
    const total = proposals.length
    const active = proposals.filter(p => p.isActive).length
    const inactive = total - active
    return { total, active, inactive }
  }

  if (loading) {
    return <LoadingState />
  }

  if (!user || !isCommission) {
    return (
      <div className="pb-24">
        <Card className="admin-card p-8 text-center text-poker-red">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">Acceso Restringido</h3>
          <p className="text-white/60">
            Solo los miembros de la Comisión pueden acceder a esta página.
          </p>
        </Card>
      </div>
    )
  }

  const stats = getFilterStats()

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-poker-red/20 text-poker-red">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Gestión de Propuestas</h1>
            <p className="text-sm text-white/60">
              Panel de administración para todas las propuestas
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setShowCreateForm(!showCreateForm)
            setEditingProposal(null)
          }}
          className="bg-poker-red hover:bg-poker-red/90"
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Propuesta
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="admin-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-white/60">Total</p>
              <p className="text-xl font-semibold text-white">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="admin-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-white/60">Activas</p>
              <p className="text-xl font-semibold text-white">{stats.active}</p>
            </div>
          </div>
        </Card>

        <Card className="admin-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/20 text-gray-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-white/60">Inactivas</p>
              <p className="text-xl font-semibold text-white">{stats.inactive}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="admin-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, contenido o autor..."
                className="pl-10 bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={filter === 'all'
                ? 'bg-poker-red hover:bg-poker-red/90'
                : 'border-white/20 text-white hover:bg-white/5'
              }
            >
              <Filter className="w-4 h-4 mr-2" />
              Todas ({stats.total})
            </Button>
            <Button
              onClick={() => setFilter('active')}
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              className={filter === 'active'
                ? 'bg-green-600 hover:bg-green-600/90'
                : 'border-white/20 text-white hover:bg-white/5'
              }
            >
              <Eye className="w-4 h-4 mr-2" />
              Activas ({stats.active})
            </Button>
            <Button
              onClick={() => setFilter('inactive')}
              variant={filter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              className={filter === 'inactive'
                ? 'bg-gray-600 hover:bg-gray-600/90'
                : 'border-white/20 text-white hover:bg-white/5'
              }
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Inactivas ({stats.inactive})
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Form */}
      {showCreateForm && (
        <ProposalForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Form */}
      {editingProposal && (
        <ProposalForm
          initialData={editingProposal}
          isEditing={true}
          onSuccess={handleEditSuccess}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="admin-card p-8 text-center text-white/60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red mx-auto mb-4"></div>
          Cargando propuestas...
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="admin-card p-8 text-center text-poker-red">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
          <p>{error}</p>
          <Button
            onClick={fetchAllProposals}
            className="mt-4 bg-poker-red hover:bg-poker-red/90"
          >
            Intentar de nuevo
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProposals.length === 0 && proposals.length === 0 && (
        <Card className="admin-card p-8 text-center text-white/60">
          <Settings className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <h3 className="text-lg font-semibold mb-2 text-white">Sin propuestas</h3>
          <p className="text-white/60 mb-4">
            Aún no se han creado propuestas para el Torneo 29.
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-poker-red hover:bg-poker-red/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear primera propuesta
          </Button>
        </Card>
      )}

      {/* No Results State */}
      {!isLoading && !error && filteredProposals.length === 0 && proposals.length > 0 && (
        <Card className="admin-card p-8 text-center text-white/60">
          <Search className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <h3 className="text-lg font-semibold mb-2 text-white">Sin resultados</h3>
          <p className="text-white/60 mb-4">
            No se encontraron propuestas que coincidan con los filtros aplicados.
          </p>
          <Button
            onClick={() => {
              setFilter('all')
              setSearchTerm('')
            }}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5"
          >
            Limpiar filtros
          </Button>
        </Card>
      )}

      {/* Proposals List */}
      {!isLoading && !error && filteredProposals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Propuestas ({filteredProposals.length})
            </h2>
          </div>

          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onEdit={handleEdit}
              onUpdate={fetchAllProposals}
              showActions={true}
              isExpanded={expandedProposal === proposal.id}
              onToggleExpand={() => handleToggleExpand(proposal.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}