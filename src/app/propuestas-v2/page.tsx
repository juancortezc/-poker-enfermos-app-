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

  if (loading) {
    return <LoadingState />
  }

  if (!user) {
    return (
      <div className="pb-24">
        <Card className="admin-card p-8 text-center text-white/60">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <h3 className="text-lg font-semibold mb-2 text-white">Acceso Requerido</h3>
          <p className="text-white/60">
            Necesitas iniciar sesión para gestionar tus propuestas.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-poker-red/20 text-poker-red">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Mis Propuestas</h1>
            <p className="text-sm text-white/60">
              {proposals.length} propuesta{proposals.length !== 1 ? 's' : ''} creada{proposals.length !== 1 ? 's' : ''}
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
          Cargando tus propuestas...
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="admin-card p-8 text-center text-poker-red">
          <FileText className="w-8 h-8 mx-auto mb-4" />
          <p>{error}</p>
          <Button
            onClick={fetchMyProposals}
            className="mt-4 bg-poker-red hover:bg-poker-red/90"
          >
            Intentar de nuevo
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && proposals.length === 0 && (
        <Card className="admin-card p-8 text-center text-white/60">
          <FileText className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <h3 className="text-lg font-semibold mb-2 text-white">Sin propuestas</h3>
          <p className="text-white/60 mb-4">
            Aún no has creado ninguna propuesta para el Torneo 29.
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-poker-red hover:bg-poker-red/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear mi primera propuesta
          </Button>
        </Card>
      )}

      {/* Proposals List */}
      {!isLoading && !error && proposals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
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
      <Card className="admin-card p-4 border-poker-red/30">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-poker-red/20 text-poker-red flex-shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white mb-1">
              Acerca de tus propuestas
            </h4>
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