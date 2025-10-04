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
  const [isFetchingProposal, setIsFetchingProposal] = useState(false)
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

  const handleEdit = async (proposal: ProposalV2) => {
    setShowCreateForm(false)
    setExpandedProposal(null)
    setEditingProposal(null)
    setIsFetchingProposal(true)

    try {
      const response = await fetch(`/api/proposals-v2/${proposal.id}`, {
        headers: buildAuthHeaders()
      })

      const data = await response.json().catch(() => ({})) as {
        proposal?: ProposalV2
        error?: string
      }

      if (!response.ok || !data?.proposal) {
        throw new Error(data?.error || 'No se pudo cargar la propuesta seleccionada')
      }

      setEditingProposal(data.proposal)
    } catch (error) {
      console.error('Error loading proposal for edit:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cargar la propuesta')
    } finally {
      setIsFetchingProposal(false)
    }
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
        <Card className="border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-[#191a2c] to-[#10111b] p-7 text-center text-rose-200 shadow-[0_18px_40px_rgba(230,70,120,0.25)]">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-200" />
          <h3 className="mb-1 text-base font-semibold text-white">Acceso Restringido</h3>
          <p className="text-sm text-rose-100/80">
            Solo los miembros de la Comisión pueden acceder a esta página.
          </p>
        </Card>
      </div>
    )
  }

  const stats = getFilterStats()

  return (
    <div className="pb-24 space-y-7">
      {/* Header */}
      <section>
        <Card className="bg-gradient-to-br from-[#201c30] via-[#1b1c2b] to-[#131422] border border-white/10 p-5 shadow-[0_18px_40px_rgba(15,15,45,0.35)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-poker-red/25 ring-1 ring-poker-red/40 text-poker-red">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">Gestión de Propuestas</h1>
                <p className="text-sm text-white/60">Panel central para crear, revisar y activar propuestas</p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateForm(!showCreateForm)
                setEditingProposal(null)
              }}
            className="relative min-w-[220px] rounded-full bg-gradient-to-r from-poker-red via-[#d73552] to-[#ff4b2b] text-white font-semibold shadow-[0_14px_30px_rgba(215,53,82,0.45)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(215,53,82,0.55)]"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Propuesta
            </Button>
          </div>
        </Card>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-white/10 bg-gradient-to-br from-[#191a2c] via-[#171828] to-[#10111b] p-4 shadow-[0_14px_32px_rgba(12,13,30,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Total</p>
              <p className="text-2xl font-semibold text-white mt-1">{stats.total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="border border-white/10 bg-gradient-to-br from-emerald-500/20 via-[#171828] to-[#10111b] p-4 shadow-[0_14px_32px_rgba(12,13,30,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Activas</p>
              <p className="text-2xl font-semibold text-white mt-1">{stats.active}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="border border-white/10 bg-gradient-to-br from-rose-500/15 via-[#171828] to-[#10111b] p-4 shadow-[0_14px_32px_rgba(12,13,30,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Inactivas</p>
              <p className="text-2xl font-semibold text-white mt-1">{stats.inactive}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/70">
              <EyeOff className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border border-white/12 bg-gradient-to-br from-[#181a2c] via-[#151726] to-[#10111b] p-5 shadow-[0_16px_36px_rgba(12,13,30,0.35)]">
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, autor o contenido"
                className="rounded-full border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-white/35"
              />
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              onClick={() => setFilter('all')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-poker-red via-[#d73552] to-[#ff4b2b] text-white shadow-[0_10px_24px_rgba(215,53,82,0.45)]'
                  : 'border border-white/15 bg-transparent text-white/70 hover:text-white hover:border-white/35'
              }`}
            >
              <Filter className="mr-2 h-4 w-4" />
              Todas ({stats.total})
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilter('active')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                filter === 'active'
                  ? 'bg-gradient-to-r from-emerald-500/80 to-emerald-400 text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)]'
                  : 'border border-white/15 bg-transparent text-white/70 hover:text-white hover:border-white/35'
              }`}
            >
              <Eye className="mr-2 h-4 w-4" />
              Activas ({stats.active})
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilter('inactive')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                filter === 'inactive'
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-[0_10px_24px_rgba(100,116,139,0.35)]'
                  : 'border border-white/15 bg-transparent text-white/70 hover:text-white hover:border-white/35'
              }`}
            >
              <EyeOff className="mr-2 h-4 w-4" />
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

      {/* Loading proposal for editing */}
      {isFetchingProposal && (
        <Card className="border border-white/12 bg-gradient-to-br from-[#181a2c] via-[#151726] to-[#10111b] p-6 text-center text-white/65 shadow-[0_16px_36px_rgba(12,13,30,0.35)]">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-poker-red"></div>
          Cargando propuesta seleccionada...
        </Card>
      )}

      {/* Edit Form */}
      {editingProposal && !isFetchingProposal && (
        <ProposalForm
          initialData={editingProposal}
          isEditing={true}
          onSuccess={handleEditSuccess}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="border border-white/12 bg-gradient-to-r from-white/12 via-transparent to-transparent p-7 text-center text-white/60 shadow-[0_16px_36px_rgba(12,13,30,0.35)]">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-poker-red"></div>
          Cargando propuestas...
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-[#191a2c] to-[#10111b] p-7 text-center text-rose-200 shadow-[0_18px_40px_rgba(230,70,120,0.25)]">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-rose-300" />
          <p className="text-sm">{error}</p>
          <Button
            variant="ghost"
            onClick={fetchAllProposals}
            className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-all hover:border-white/40 hover:text-white"
          >
            Intentar de nuevo
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProposals.length === 0 && proposals.length === 0 && (
        <Card className="border border-white/12 bg-gradient-to-br from-[#191a2c] via-[#171828] to-[#10111b] p-7 text-center text-white/65 shadow-[0_18px_40px_rgba(12,13,30,0.35)]">
          <Settings className="mx-auto mb-3 h-10 w-10 text-poker-red" />
          <h3 className="mb-1 text-base font-semibold text-white">Sin propuestas</h3>
          <p className="text-sm text-white/55 mb-4">
            Aún no se han creado propuestas para el Torneo 29.
          </p>
          <Button
            variant="ghost"
            onClick={() => setShowCreateForm(true)}
            className="rounded-full bg-gradient-to-r from-poker-red via-[#d73552] to-[#ff4b2b] px-5 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(215,53,82,0.45)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(215,53,82,0.55)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear primera propuesta
          </Button>
        </Card>
      )}

      {/* No Results State */}
      {!isLoading && !error && filteredProposals.length === 0 && proposals.length > 0 && (
        <Card className="border border-white/12 bg-gradient-to-br from-[#191a2c] via-[#171828] to-[#10111b] p-7 text-center text-white/65 shadow-[0_18px_40px_rgba(12,13,30,0.35)]">
          <Search className="mx-auto mb-3 h-10 w-10 text-poker-red" />
          <h3 className="mb-1 text-base font-semibold text-white">Sin resultados</h3>
          <p className="text-sm text-white/55 mb-4">
            No se encontraron propuestas que coincidan con los filtros aplicados.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setFilter('all')
              setSearchTerm('')
            }}
            className="rounded-full border border-white/20 bg-transparent px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition-all hover:border-white/40 hover:text-white"
          >
            Limpiar filtros
          </Button>
        </Card>
      )}

      {/* Proposals List */}
      {!isLoading && !error && filteredProposals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-[0.24em] text-white/60">
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
