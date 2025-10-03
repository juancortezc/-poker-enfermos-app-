'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { Button } from '@/components/ui/button'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import { Lightbulb, Plus, Send } from 'lucide-react'

interface ProposalV2 {
  id: number
  title: string
  content: string
  isActive: boolean
  createdAt: string
  createdBy?: {
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
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/proposals-v2')
      if (!response.ok) {
        throw new Error('Error al cargar propuestas')
      }

      const data = await response.json()
      setProposals(data.proposals || [])
    } catch (error) {
      console.error('Error fetching proposals:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar propuestas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      toast.error('Título y contenido son obligatorios')
      return
    }

    try {
      setSaving(true)

      const response = await fetch('/api/proposals-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear propuesta')
      }

      const data = await response.json()
      setProposals(prev => [data.proposal, ...prev])
      setTitle('')
      setContent('')
      setShowForm(false)
      toast.success('Propuesta creada exitosamente')
    } catch (error) {
      console.error('Error creating proposal:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear propuesta')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Comision':
        return 'bg-poker-red text-white'
      case 'Enfermo':
        return 'bg-gray-600 text-white'
      case 'Invitado':
        return 'bg-orange-600 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-poker-red/20 text-poker-red">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Propuestas T29</h1>
            <p className="text-sm text-white/60">
              {proposals.length} propuesta{proposals.length !== 1 ? 's' : ''} activa{proposals.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {user && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-poker-red hover:bg-poker-red/90"
            disabled={saving}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Propuesta
          </Button>
        )}
      </header>

      {/* Create Form */}
      {showForm && user && (
        <Card className="admin-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Título
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la propuesta..."
                maxLength={200}
                disabled={saving}
                className="bg-white/5 border-white/20 text-white"
              />
              <p className="text-xs text-white/50 mt-1">
                {title.length}/200 caracteres
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Contenido
              </label>
              <AutoResizeTextarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe tu propuesta en detalle..."
                maxLength={5000}
                disabled={saving}
                className="bg-white/5 border-white/20 text-white min-h-32"
              />
              <p className="text-xs text-white/50 mt-1">
                {content.length}/5000 caracteres
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={saving || !title.trim() || !content.trim()}
                className="bg-poker-red hover:bg-poker-red/90"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Crear Propuesta
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                variant="outline"
                disabled={saving}
                className="border-white/20 text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
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
          {error}
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && proposals.length === 0 && (
        <Card className="admin-card p-8 text-center text-white/60">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <h3 className="text-lg font-semibold mb-2 text-white">Sin propuestas</h3>
          <p className="text-white/60">
            Aún no hay propuestas para el Torneo 29. ¡Sé el primero en proponer algo!
          </p>
        </Card>
      )}

      {/* Proposals List */}
      {!isLoading && !error && proposals.length > 0 && (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="admin-card overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {proposal.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      {proposal.createdBy && (
                        <>
                          <span>{proposal.createdBy.firstName} {proposal.createdBy.lastName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(proposal.createdBy.role)}`}>
                            {proposal.createdBy.role}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDate(proposal.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="text-white/85 leading-relaxed whitespace-pre-line">
                  {proposal.content}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}