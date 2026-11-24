'use client'

import { useState } from 'react'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Edit2, User, UserX } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'

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

interface PlayerCardProps {
  player: Player
  canEdit: boolean
  onPlayerDeactivated?: () => void
}

export default function PlayerCard({ player, canEdit, onPlayerDeactivated }: PlayerCardProps) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.Comision:
        return {
          classes: 'bg-poker-red text-white',
          label: 'Comisión'
        }
      case UserRole.Enfermo:
        return {
          classes: 'bg-gray-700 text-white',
          label: 'Enfermo'
        }
      case UserRole.Invitado:
        return {
          classes: 'bg-pink-500 text-white',
          label: 'Invitado'
        }
      default:
        return {
          classes: 'bg-gray-600 text-white',
          label: 'Jugador'
        }
    }
  }

  const handleEdit = () => {
    if (player.role === UserRole.Invitado) {
      router.push(`/players/edit-invitado/${player.id}`)
    } else {
      router.push(`/players/edit/${player.id}`)
    }
  }

  const handleDeactivate = async () => {
    try {
      setIsDeactivating(true)
      const response = await fetch(`/api/players/${player.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al desactivar jugador')
      }

      toast.success(`${player.firstName} ${player.lastName} ha sido desactivado`)
      setShowConfirmDeactivate(false)

      if (onPlayerDeactivated) {
        onPlayerDeactivated()
      }
    } catch (error) {
      console.error('Error deactivating player:', error)
      toast.error(error instanceof Error ? error.message : 'Error al desactivar jugador')
    } finally {
      setIsDeactivating(false)
    }
  }

  const roleBadge = getRoleBadge(player.role)
  const mainAlias = player.aliases[0]?.trim() || ''

  return (
    <div className="bg-poker-card border border-white/10 rounded-lg p-4 hover:bg-poker-card/80 transition-all">
      <div className="flex items-center justify-between">
        {/* Left side - Avatar and info */}
        <div className="flex items-center space-x-3">
          {/* Circular Avatar */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
            {player.photoUrl && !imageError ? (
              <Image
                src={player.photoUrl}
                alt={`${player.firstName} ${player.lastName}`}
                width={48}
                height={48}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Name and Role */}
          <div className="space-y-1">
            <h3 className="font-semibold text-white">
              {player.firstName} {player.lastName}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${roleBadge.classes}`}>
                {roleBadge.label}
              </span>
              {mainAlias && (
                <span className="text-orange-400 text-xs font-semibold">
                  • {mainAlias}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Action buttons */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmDeactivate(true)}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-2"
              title="Desactivar jugador"
            >
              <UserX className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
              title="Editar jugador"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Confirm Deactivate Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDeactivate}
        onClose={() => setShowConfirmDeactivate(false)}
        onConfirm={handleDeactivate}
        title="Desactivar Jugador"
        description={`¿Estás seguro que deseas desactivar a ${player.firstName} ${player.lastName}? Esta acción ocultará al jugador de las listas activas pero no eliminará su historial.`}
        confirmText="Desactivar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  )
}