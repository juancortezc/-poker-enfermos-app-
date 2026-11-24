'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { buildAuthHeaders } from '@/lib/client-auth'
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import ImageUpload from '@/components/ui/ImageUpload'

interface Proposal {
  id: number
  title: string
  content: string
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
  createdById: string | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { headers: buildAuthHeaders() })
  if (!response.ok) {
    throw new Error('Error al cargar las propuestas')
  }
  return response.json() as Promise<{ proposals: Proposal[] }>
}

export default function MisProposalsPage() {
  const { user } = useAuth()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newProposal, setNewProposal] = useState({ title: '', content: '', imageUrl: '' })
  const [showNewForm, setShowNewForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data, error, mutate } = useSWR(
    user ? `/api/proposals/my-proposals` : null,
    fetcher
  )

  if (!user) {
    return (
      <div className="px-4 pt-20 pb-24 text-center text-white/60">
        Debes iniciar sesión para ver tus propuestas
      </div>
    )
  }

  const proposals = data?.proposals ?? []

  const handleCreateProposal = async () => {
    if (!newProposal.title || !newProposal.content) {
      alert('El título y contenido son obligatorios')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          ...buildAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProposal),
      })

      if (response.ok) {
        setNewProposal({ title: '', content: '', imageUrl: '' })
        setShowNewForm(false)
        mutate()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear la propuesta')
      }
    } catch (error) {
      alert('Error al crear la propuesta')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateProposal = async (proposal: Proposal) => {
    try {
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: {
          ...buildAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: proposal.title,
          content: proposal.content,
          imageUrl: proposal.imageUrl,
          isActive: proposal.isActive
        }),
      })

      if (response.ok) {
        setEditingId(null)
        mutate()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al actualizar la propuesta')
      }
    } catch (error) {
      alert('Error al actualizar la propuesta')
    }
  }

  const handleDeleteProposal = async (proposalId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta propuesta?')) {
      return
    }

    setDeletingId(proposalId)
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      })

      if (response.ok) {
        mutate()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar la propuesta')
      }
    } catch (error) {
      alert('Error al eliminar la propuesta')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleProposalStatus = async (proposal: Proposal) => {
    try {
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: {
          ...buildAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !proposal.isActive
        }),
      })

      if (response.ok) {
        mutate()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al cambiar el estado')
      }
    } catch (error) {
      alert('Error al cambiar el estado')
    }
  }

  return (
    <div className="px-4 pt-20 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Mis Propuestas</h1>
        <p className="text-sm text-white/60">
          Crea y gestiona tus propuestas para el T29
        </p>
      </header>

      {/* Botón para crear nueva propuesta */}
      {!showNewForm && (
        <Button
          onClick={() => setShowNewForm(true)}
          className="w-full mb-6 bg-poker-red hover:bg-poker-red/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Propuesta
        </Button>
      )}

      {/* Formulario para nueva propuesta */}
      {showNewForm && (
        <Card className="admin-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Nueva Propuesta</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Título
              </label>
              <input
                type="text"
                value={newProposal.title}
                onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                placeholder="Título de la propuesta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Contenido
              </label>
              <textarea
                value={newProposal.content}
                onChange={(e) => setNewProposal({ ...newProposal, content: e.target.value })}
                className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                rows={4}
                placeholder="Describe tu propuesta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Imagen (opcional)
              </label>
              <ImageUpload
                value={newProposal.imageUrl}
                onChange={(url) => setNewProposal({ ...newProposal, imageUrl: url })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateProposal}
                disabled={isSubmitting}
                className="flex-1 bg-poker-red hover:bg-poker-red/90"
              >
                {isSubmitting ? 'Creando...' : 'Crear Propuesta'}
              </Button>
              <Button
                onClick={() => {
                  setShowNewForm(false)
                  setNewProposal({ title: '', content: '', imageUrl: '' })
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de propuestas del usuario */}
      <div className="space-y-4">
        {proposals.length === 0 && !showNewForm && (
          <Card className="admin-card p-8 text-center text-white/60">
            <p className="mb-4">Aún no has creado ninguna propuesta</p>
            <Button
              onClick={() => setShowNewForm(true)}
              className="bg-poker-red hover:bg-poker-red/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear tu primera propuesta
            </Button>
          </Card>
        )}

        {proposals.map((proposal) => (
          <Card key={proposal.id} className="admin-card p-4">
            {editingId === proposal.id ? (
              // Modo edición
              <div className="space-y-4">
                <input
                  type="text"
                  value={proposal.title}
                  onChange={(e) => {
                    const updated = proposals.map(p =>
                      p.id === proposal.id ? { ...p, title: e.target.value } : p
                    )
                    mutate({ proposals: updated }, false)
                  }}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                />
                <textarea
                  value={proposal.content}
                  onChange={(e) => {
                    const updated = proposals.map(p =>
                      p.id === proposal.id ? { ...p, content: e.target.value } : p
                    )
                    mutate({ proposals: updated }, false)
                  }}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateProposal(proposal)}
                    className="flex-1 bg-poker-red hover:bg-poker-red/90"
                  >
                    Guardar
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingId(null)
                      mutate()
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              // Modo vista
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white">{proposal.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    proposal.isActive
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {proposal.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <p className="text-white/70 mb-3">{proposal.content}</p>
                {proposal.imageUrl && (
                  <img
                    src={proposal.imageUrl}
                    alt={proposal.title}
                    className="w-full h-48 object-cover rounded mb-3"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => toggleProposalStatus(proposal)}
                    variant="outline"
                    size="sm"
                  >
                    {proposal.isActive ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Activar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setEditingId(proposal.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDeleteProposal(proposal.id)}
                    variant="outline"
                    size="sm"
                    disabled={deletingId === proposal.id}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {deletingId === proposal.id ? 'Eliminando...' : 'Eliminar'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Link para ver propuestas públicas */}
      <div className="mt-8 text-center">
        <Link href="/t29" className="text-poker-red hover:text-poker-red/80">
          Ver todas las propuestas activas →
        </Link>
      </div>
    </div>
  )
}