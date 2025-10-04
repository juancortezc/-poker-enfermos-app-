'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProposalForm } from '@/components/proposals/ProposalForm'
import { ProposalCard } from '@/components/proposals/ProposalCard'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import { Plus, Lightbulb, FileText } from 'lucide-react'

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

export default function PropuestasV2Page() {
  const { user, loading } = useAuth()
  const [proposals, setProposals] = useState<ProposalV2[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProposal, setEditingProposal] = useState<ProposalV2 | null>(null)
  const [isFetchingProposal, setIsFetchingProposal] = useState(false)
  const [expandedProposal, setExpandedProposal] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      fetchMyProposals()
    }
  }, [user])

  const fetchMyProposals = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/proposals-v2/my', {
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Error al cargar tus propuestas')
      }

      const data = await response.json()
      setProposals(data.proposals || [])
    } catch (error) {
      console.error('Error fetching my proposals:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar propuestas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    fetchMyProposals()
  }

  const handleEditSuccess = () => {
    setEditingProposal(null)
    fetchMyProposals()
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

  if (loading) {
    return <LoadingState />
  }

  if (!user) {
    return (
      <div className="pb-24">
        <Card className="border border-white/12 bg-gradient-to-br from-[#191a2c] via-[#171828] to-[#10111b] p-7 text-center text-white/65 shadow-[0_18px_40px_rgba(12,13,30,0.35)]">
          <Lightbulb className="mx-auto mb-3 h-10 w-10 text-poker-red" />
          <h3 className="mb-1 text-base font-semibold text-white">Acceso Requerido</h3>
          <p className="text-sm text-white/55">
            Necesitas iniciar sesión para gestionar tus propuestas.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="pb-24 space-y-7">
      {/* Header */}
      <section>
        <Card className="bg-gradient-to-br from-[#201c30] via-[#1b1c2b] to-[#131422] border border-white/10 p-5 shadow-[0_18px_40px_rgba(15,15,45,0.35)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-poker-red/25 ring-1 ring-poker-red/40 text-poker-red">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">Mis Propuestas</h1>
                <p className="text-sm text-white/60">
                  {proposals.length} propuesta{proposals.length !== 1 ? 's' : ''} creada{proposals.length !== 1 ? 's' : ''}
                </p>
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
          Cargando tus propuestas...
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-[#191a2c] to-[#10111b] p-7 text-center text-rose-200 shadow-[0_18px_40px_rgba(230,70,120,0.25)]">
          <FileText className="mx-auto mb-4 h-10 w-10 text-rose-200" />
          <p className="text-sm">{error}</p>
          <Button
            variant="ghost"
            onClick={fetchMyProposals}
            className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-all hover:border-white/40 hover:text-white"
          >
            Intentar de nuevo
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && proposals.length === 0 && (
        <Card className="border border-white/12 bg-gradient-to-br from-[#191a2c] via-[#171828] to-[#10111b] p-7 text-center text-white/65 shadow-[0_18px_40px_rgba(12,13,30,0.35)]">
          <FileText className="mx-auto mb-3 h-10 w-10 text-poker-red" />
          <h3 className="mb-1 text-base font-semibold text-white">Sin propuestas</h3>
          <p className="text-sm text-white/55 mb-4">
            Aún no has creado ninguna propuesta para el Torneo 29.
          </p>
          <Button
            variant="ghost"
            onClick={() => setShowCreateForm(true)}
            className="rounded-full bg-gradient-to-r from-poker-red via-[#d73552] to-[#ff4b2b] px-5 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(215,53,82,0.45)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(215,53,82,0.55)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear mi primera propuesta
          </Button>
        </Card>
      )}

      {/* Proposals List */}
      {!isLoading && !error && proposals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-[0.24em] text-white/60">
              Tus Propuestas ({proposals.length})
            </h2>
          </div>

          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onEdit={handleEdit}
              onUpdate={fetchMyProposals}
              showActions={true}
              isExpanded={expandedProposal === proposal.id}
              onToggleExpand={() => handleToggleExpand(proposal.id)}
            />
          ))}
        </div>
      )}

      {/* Info Footer */}
      <Card className="border border-white/12 bg-gradient-to-br from-[#181a2c] via-[#151726] to-[#10111b] p-5 shadow-[0_16px_36px_rgba(12,13,30,0.35)]">
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-poker-red/25 text-poker-red">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold text-white/85">Acerca de tus propuestas</h4>
            <p className="text-xs text-white/60 leading-relaxed">
              • Puedes editar y desactivar tus propias propuestas<br />
              • Las propuestas activas serán visibles en la sección T29<br />
              • La Comisión revisará y evaluará todas las propuestas
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
