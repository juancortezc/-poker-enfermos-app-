'use client'

import { UserRole } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, Phone, Mail, Calendar, Users, Shield, User } from 'lucide-react'
import Image from 'next/image'

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
  onEdit: () => void
}

export default function PlayerCard({ player, canEdit, onEdit }: PlayerCardProps) {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.Comision:
        return {
          color: 'bg-poker-red text-white',
          icon: Shield,
          label: 'Comisión'
        }
      case UserRole.Enfermo:
        return {
          color: 'bg-poker-green text-white',
          icon: User,
          label: 'Enfermo'
        }
      case UserRole.Invitado:
        return {
          color: 'bg-poker-cyan text-poker-dark',
          icon: Users,
          label: 'Invitado'
        }
    }
  }

  const roleBadge = getRoleBadge(player.role)
  const RoleIcon = roleBadge.icon
  const mainAlias = player.aliases[0] || ''

  return (
    <Card className="bg-poker-card border-white/10 hover:border-poker-red/30 transition-smooth">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          {/* Avatar y info principal */}
          <div className="flex items-start space-x-3 flex-1">
            {/* Avatar */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-poker-dark">
              {player.photoUrl ? (
                <Image
                  src={player.photoUrl}
                  alt={`${player.firstName} ${player.lastName}`}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-poker-muted">
                  <User className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Nombre y alias */}
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-poker-text truncate">
                  {player.firstName} {player.lastName}
                </h3>
                {mainAlias && (
                  <span className="text-sm text-poker-cyan font-medium">
                    ({mainAlias})
                  </span>
                )}
              </div>

              {/* Badge de rol */}
              <div className="flex items-center space-x-2 mb-2">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {roleBadge.label}
                </div>
                {player.pin && (
                  <span className="text-xs text-poker-muted">
                    PIN: ●●●●
                  </span>
                )}
              </div>

              {/* Información adicional */}
              <div className="space-y-1">
                {/* Invitador (para invitados) */}
                {player.inviter && (
                  <div className="flex items-center text-xs text-poker-muted">
                    <Users className="w-3 h-3 mr-1" />
                    Invitado por {player.inviter.firstName} {player.inviter.lastName}
                  </div>
                )}

                {/* Teléfono */}
                {player.phone && (
                  <div className="flex items-center text-xs text-poker-muted">
                    <Phone className="w-3 h-3 mr-1" />
                    {player.phone}
                  </div>
                )}

                {/* Email */}
                {player.email && (
                  <div className="flex items-center text-xs text-poker-muted">
                    <Mail className="w-3 h-3 mr-1" />
                    {player.email}
                  </div>
                )}

                {/* Fecha de nacimiento */}
                {player.birthDate && (
                  <div className="flex items-center text-xs text-poker-muted">
                    <Calendar className="w-3 h-3 mr-1" />
                    {player.birthDate}
                  </div>
                )}

                {/* Número de invitados (para enfermos/comisión) */}
                {player._count?.invitees && player._count.invitees > 0 && (
                  <div className="flex items-center text-xs text-poker-cyan">
                    <Users className="w-3 h-3 mr-1" />
                    {player._count.invitees} invitado{player._count.invitees > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Aliases adicionales */}
              {player.aliases.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {player.aliases.slice(1).map((alias, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-poker-dark/50 text-xs text-poker-muted rounded-md"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botón de editar */}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-poker-muted hover:text-poker-red hover:bg-poker-red/10 p-2"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}