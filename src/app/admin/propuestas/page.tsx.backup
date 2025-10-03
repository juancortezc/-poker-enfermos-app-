'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import { Lightbulb, Power, Edit, X, Trash2 } from 'lucide-react'

interface Proposal {
  id: number
  title: string
  content: string
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { headers: buildAuthHeaders() })
  if (!response.ok) {
    throw new Error('No se pudieron cargar las propuestas')
  }
  return response.json() as Promise<{ proposals: Proposal[] }>
}

export default function PropuestasAdminPage() {
  const { user, loading } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null)

  const canManage = user?.role === 'Comision'
  const { data, isLoading, error, mutate } = useSWR(
    canManage ? '/api/proposals?includeInactive=true' : null,
    fetcher
  )

  if (loading) {
    return <LoadingState />
  }

  if (!user || user.role !== 'Comision') {
    return null
  }

  const proposals = data?.proposals ?? []

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('Completa título y propuesta antes de guardar')
      return
    }

    try {
      setSaving(true)

      if (editingProposal) {
        // Update existing proposal
        const response = await fetch(`/api/proposals/${editingProposal.id}`, {
          method: 'PATCH',
          headers: buildAuthHeaders({}, { includeJson: true }),
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            imageUrl: imageUrl
          })
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? 'No se pudo actualizar la propuesta')
        }

        toast.success('Propuesta actualizada')
        setEditingProposal(null)
      } else {
        // Create new proposal
        const response = await fetch('/api/proposals', {
          method: 'POST',
          headers: buildAuthHeaders({}, { includeJson: true }),
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            imageUrl: imageUrl
          })
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? 'No se pudo guardar la propuesta')
        }

        toast.success('Propuesta guardada')
      }

      setTitle('')
      setContent('')
      setImageUrl(null)
      mutate()
    } catch (submitError) {
      console.error(submitError)
      toast.error(submitError instanceof Error ? submitError.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const toggleProposal = async (proposal: Proposal) => {
    try {
      setTogglingId(proposal.id)
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({ isActive: !proposal.isActive })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'No se pudo actualizar la propuesta')
      }

      toast.success(proposal.isActive ? 'Propuesta desactivada' : 'Propuesta activada')
      mutate()
    } catch (toggleError) {
      console.error(toggleError)
      toast.error(toggleError instanceof Error ? toggleError.message : 'Error inesperado')
    } finally {
      setTogglingId(null)
    }
  }

  const startEdit = (proposal: Proposal) => {
    setEditingProposal(proposal)
    setTitle(proposal.title)
    setContent(proposal.content)
    setImageUrl(proposal.imageUrl || null)
  }

  const cancelEdit = () => {
    setEditingProposal(null)
    setTitle('')
    setContent('')
    setImageUrl(null)
  }

  const deleteProposal = async (proposal: Proposal) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la propuesta "${proposal.title}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      setDeletingId(proposal.id)
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'No se pudo eliminar la propuesta')
      }

      toast.success('Propuesta eliminada exitosamente')

      // If we were editing this proposal, cancel the edit
      if (editingProposal?.id === proposal.id) {
        cancelEdit()
      }

      mutate()
    } catch (deleteError) {
      console.error(deleteError)
      toast.error(deleteError instanceof Error ? deleteError.message : 'Error inesperado')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-noir-root pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-16 space-y-8">
        <header className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-poker-red/20 text-poker-red">
            <Lightbulb size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Propuestas T29</h1>
            <p className="text-sm text-white/60">Ingresa nuevas propuestas o controla su disponibilidad.</p>
          </div>
        </header>

        <Card className="admin-card p-6 space-y-4">
          {editingProposal && (
            <div className="flex items-center justify-between mb-4 p-3 bg-blue-500/20 border border-blue-500/40 rounded-lg">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium">Editando propuesta</span>
              </div>
              <Button
                onClick={cancelEdit}
                variant="outline"
                size="sm"
                className="border-blue-500/40 text-blue-400 hover:bg-blue-500/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.2em] text-white/60">
                Nombre de la propuesta
              </label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Nueva dinámica de puntos"
                maxLength={80}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.2em] text-white/60">
                Detalle de la propuesta
              </label>
              <AutoResizeTextarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Copia y pega desde Google Docs. Describe la propuesta con todos los detalles necesarios..."
                minRows={6}
                maxRows={15}
                className="leading-relaxed"
                style={{ whiteSpace: 'pre-line' }}
              />
              <p className="text-xs text-white/40">
                💡 Tip: Para tablas complejas, úsalas en la imagen de abajo
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.2em] text-white/60">
                Imagen complementaria (opcional)
              </label>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                placeholder="Sube una imagen para mostrar tablas, diagramas o contenido visual"
                disabled={saving}
              />
            </div>

            <div className="flex justify-end gap-3">
              {editingProposal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={saving} className="noir-button">
                {saving ? (editingProposal ? 'Actualizando...' : 'Guardando...') : (editingProposal ? 'Actualizar' : 'Guardar')}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="admin-card p-0 overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-sm font-semibold tracking-[0.25em] text-white/70">Historial</h2>
          </div>
          <div className="divide-y divide-white/5">
            {isLoading && (
              <div className="px-6 py-8 text-center text-white/60">Cargando propuestas...</div>
            )}
            {error && (
              <div className="px-6 py-8 text-center text-poker-red">{error.message}</div>
            )}
            {!isLoading && proposals.length === 0 && !error && (
              <div className="px-6 py-8 text-center text-white/60">Aún no hay propuestas registradas.</div>
            )}
            {proposals.map((proposal) => (
              <div key={proposal.id} className="px-6 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">{proposal.title}</h3>
                    <p className="text-xs text-white/40">
                      {new Date(proposal.createdAt).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => startEdit(proposal)}
                      variant="outline"
                      size="sm"
                      className="border-white/30 text-white hover:bg-white/10"
                      disabled={deletingId === proposal.id}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => deleteProposal(proposal)}
                      variant="outline"
                      size="sm"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/20"
                      disabled={deletingId === proposal.id || togglingId === proposal.id}
                    >
                      {deletingId === proposal.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => toggleProposal(proposal)}
                      disabled={togglingId === proposal.id || deletingId === proposal.id}
                      variant={proposal.isActive ? 'outline' : 'default'}
                      size="sm"
                      className={proposal.isActive ? 'border-poker-red/40 text-poker-red' : 'bg-poker-red text-white'}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      {togglingId === proposal.id
                        ? 'Actualizando...'
                        : proposal.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">
                    {proposal.content}
                  </p>

                  {proposal.imageUrl && (
                    <div className="mt-3">
                      <img
                        src={proposal.imageUrl}
                        alt="Imagen de la propuesta"
                        className="max-w-full h-auto rounded-lg border border-white/20"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  )}
                </div>

                {!proposal.isActive && (
                  <span className="inline-flex w-fit items-center rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
                    Inactiva
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
