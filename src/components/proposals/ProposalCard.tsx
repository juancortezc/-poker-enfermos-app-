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
        return 'bg-poker-red text-white'
      case 'Enfermo':
        return 'bg-gray-600 text-white'
      case 'Invitado':
        return 'bg-orange-600 text-white'
      default:
        return 'bg-gray-500 text-white'
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
    <Card className={`admin-card overflow-hidden transition-all duration-200 ${
      !proposal.isActive ? 'opacity-60' : ''
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                {proposal.title}
              </h3>
              {!proposal.isActive && (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-600 text-gray-300">
                  Inactiva
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-white/60">
              {proposal.createdBy && (
                <>
                  <User className="w-4 h-4" />
                  <span>{proposal.createdBy.firstName} {proposal.createdBy.lastName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(proposal.createdBy.role)}`}>
                    {proposal.createdBy.role}
                  </span>
                  <span>•</span>
                </>
              )}
              <Calendar className="w-4 h-4" />
              <span>{formatDate(proposal.createdAt)}</span>
            </div>
          </div>

          {onToggleExpand && (
            <Button
              onClick={onToggleExpand}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
            >
              {isExpanded ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Contraer
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalles
                </>
              )}
            </Button>
          )}
        </div>

        {/* Preview del objetivo si no está expandido */}
        {!isExpanded && (
          <p className="text-white/70 text-sm line-clamp-2">
            {proposal.objective}
          </p>
        )}
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Objetivo */}
          <div>
            <h4 className="text-sm font-medium text-poker-red mb-2">Objetivo</h4>
            <p className="text-white/85 text-sm leading-relaxed">
              {proposal.objective}
            </p>
          </div>

          {/* Situación a modificar */}
          <div>
            <h4 className="text-sm font-medium text-poker-red mb-2">Situación a Modificar</h4>
            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">
              {proposal.situation}
            </p>
          </div>

          {/* Propuesta */}
          <div>
            <h4 className="text-sm font-medium text-poker-red mb-2">Propuesta</h4>
            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">
              {proposal.proposal}
            </p>
          </div>

          {/* Imagen */}
          {proposal.imageUrl && (
            <div>
              <h4 className="text-sm font-medium text-poker-red mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Imagen
              </h4>
              <div className="rounded-lg overflow-hidden border border-white/20">
                <img
                  src={proposal.imageUrl}
                  alt="Imagen de la propuesta"
                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  onClick={() => window.open(proposal.imageUrl!, '_blank')}
                />
              </div>
              <p className="text-xs text-white/50 mt-2 text-center">
                Click para ver en tamaño completo
              </p>
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      {showActions && (canEdit || canDelete) && (
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            {canEdit && onEdit && (
              <Button
                onClick={() => onEdit(proposal)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}

            {canEdit && (
              <Button
                onClick={handleToggleStatus}
                disabled={toggling}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5"
              >
                {toggling ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Power className="w-4 h-4 mr-2" />
                )}
                {proposal.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            )}

            {canDelete && (
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2"></div>
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
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
