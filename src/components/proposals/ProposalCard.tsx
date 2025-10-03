'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buildAuthHeaders } from '@/lib/client-auth'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-toastify'
import {
  Edit,
  Power,
  Trash2,
  Calendar,
  User,
  Eye,
  EyeOff,
  Image as ImageIcon
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

interface ProposalCardProps {
  proposal: ProposalV2
  onEdit?: (proposal: ProposalV2) => void | Promise<void>
  onUpdate?: () => void
  showActions?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function ProposalCard({
  proposal,
  onEdit,
  onUpdate,
  showActions = true,
  isExpanded = false,
  onToggleExpand
}: ProposalCardProps) {
  const { user } = useAuth()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canEdit = user && (user.role === 'Comision' || proposal.createdBy?.id === user.id)
  const canDelete = user?.role === 'Comision'

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
        return 'border border-poker-red/40 bg-poker-red/20 text-poker-red'
      case 'Enfermo':
        return 'border border-white/20 bg-white/10 text-white/80'
      case 'Invitado':
        return 'border border-amber-500/40 bg-amber-500/20 text-amber-200'
      default:
        return 'border border-white/15 bg-white/10 text-white/70'
    }
  }

  const handleToggleStatus = async () => {
    try {
      setToggling(true)
      const response = await fetch(`/api/proposals-v2/${proposal.id}/toggle`, {
        method: 'PUT',
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cambiar estado')
      }

      const data = await response.json()
      toast.success(data.message)

      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error toggling proposal:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cambiar estado')
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la propuesta "${proposal.title}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/proposals-v2/${proposal.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar propuesta')
      }

      toast.success('Propuesta eliminada exitosamente')

      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting proposal:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar propuesta')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card
      className={`overflow-hidden border border-white/12 bg-gradient-to-br from-[#1b1d2f] via-[#181a2c] to-[#111221] transition-all duration-500 hover:-translate-y-1 hover:border-poker-red/60 hover:shadow-[0_24px_60px_rgba(255,93,143,0.25)] shadow-[0_18px_40px_rgba(11,12,32,0.45)] ${
        proposal.isActive ? '' : 'opacity-90'
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-white/6 via-transparent to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white text-lg font-semibold tracking-tight">
                {proposal.title}
              </h3>
              {!proposal.isActive && (
                <span className="rounded-full bg-slate-700/60 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                  Inactiva
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-white/60">
              {proposal.createdBy && (
                <>
                  <User className="h-4 w-4" />
                  <span className="text-white/80">
                    {proposal.createdBy.firstName} {proposal.createdBy.lastName}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${getRoleBadgeColor(proposal.createdBy.role)}`}>
                    {proposal.createdBy.role}
                  </span>
                  <span className="text-white/30">•</span>
                </>
              )}
              <Calendar className="h-4 w-4" />
              <span>{formatDate(proposal.createdAt)}</span>
            </div>

            {!isExpanded && (
              <p className="mt-3 line-clamp-2 text-sm text-white/70">
                {proposal.objective}
              </p>
            )}
          </div>

          {onToggleExpand && (
            <Button
              variant="ghost"
              onClick={onToggleExpand}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
                isExpanded
                  ? 'bg-gradient-to-r from-poker-red/85 to-poker-red text-white shadow-[0_14px_30px_rgba(255,93,143,0.3)]'
                  : 'border border-white/15 text-white/70 hover:text-white hover:border-white/35'
              }`}
            >
              {isExpanded ? 'Contraer' : 'Detalles'}
            </Button>
          )}
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-4 space-y-4">
          {/* Objetivo */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-poker-red/80">Objetivo</h4>
            <p className="text-sm leading-relaxed text-white/75">
              {proposal.objective}
            </p>
          </div>

          {/* Situación a modificar */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-poker-red/80">Situación a Modificar</h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
              {proposal.situation}
            </p>
          </div>

          {/* Propuesta */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-poker-red/80">Propuesta</h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
              {proposal.proposal}
            </p>
          </div>

          {/* Imagen */}
          {proposal.imageUrl && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-poker-red/80">
                <ImageIcon className="w-4 h-4" />
                Imagen
              </h4>
              <div className="overflow-hidden rounded-lg border border-white/15">
                <img
                  src={proposal.imageUrl}
                  alt="Imagen de la propuesta"
                  className="h-auto w-full cursor-pointer transition-all hover:opacity-95"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  onClick={() => window.open(proposal.imageUrl!, '_blank')}
                />
              </div>
              <p className="mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-white/45">
                Click para ver en tamaño completo
              </p>
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      {showActions && (canEdit || canDelete) && (
        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {canEdit && onEdit && (
              <Button
                variant="ghost"
                onClick={() => onEdit(proposal)}
                className="rounded-full border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition-all hover:border-white/35 hover:text-white"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}

            {canEdit && (
              <Button
                variant="ghost"
                onClick={handleToggleStatus}
                disabled={toggling}
                className="rounded-full border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition-all hover:border-white/35 hover:text-white"
              >
                {toggling ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                {proposal.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200 transition-all hover:border-rose-400 hover:text-white"
              >
                {deleting ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-rose-200"></div>
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
