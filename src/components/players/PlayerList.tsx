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
  activeTab: 'enfermos' | 'invitados'
}

export default function PlayerList({ 
  players, 
  canEdit, 
  onEditPlayer, 
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
    <div className="space-y-3">
      {players.map((player, index) => (
        <div 
          key={player.id}
          className={`animate-stagger animate-stagger-${Math.min(index + 1, 4)}`}
        >
          <PlayerCard
            player={player}
            canEdit={canEdit}
            onEdit={() => onEditPlayer(player)}
          />
        </div>
      ))}
    </div>
  )
}