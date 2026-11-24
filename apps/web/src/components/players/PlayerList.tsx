'use client'

import { UserRole } from '@prisma/client'
import PlayerCard from './PlayerCard'

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

interface PlayerListProps {
  players: Player[]
  canEdit: boolean
  onEditPlayer: (player: Player) => void
  onPlayerDeactivated?: () => void
  activeTab: 'enfermos' | 'invitados'
}

export default function PlayerList({
  players,
  canEdit,
  onEditPlayer,
  onPlayerDeactivated,
  activeTab
}: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-poker-card flex items-center justify-center">
          <span className="text-2xl">👥</span>
        </div>
        <h3 className="text-lg font-semibold text-poker-text mb-2">
          No hay {activeTab === 'enfermos' ? 'enfermos' : 'invitados'}
        </h3>
        <p className="text-poker-muted">
          {canEdit 
            ? `Agrega el primer ${activeTab === 'enfermos' ? 'enfermo' : 'invitado'} al grupo`
            : `Aún no hay ${activeTab === 'enfermos' ? 'enfermos' : 'invitados'} registrados`
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {players.map((player, index) => (
        <PlayerCard
          key={player.id}
          player={player}
          canEdit={canEdit}
          onPlayerDeactivated={onPlayerDeactivated}
        />
      ))}
    </div>
  )
}