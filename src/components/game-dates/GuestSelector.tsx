'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, ChevronLeft, ChevronRight, Users, ExternalLink } from 'lucide-react'
import { UserRole } from '@prisma/client'
import Link from 'next/link'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  photoUrl?: string
  inviter?: {
    firstName: string
    lastName: string
  }
}

interface GuestSelectorProps {
  tournamentId: number
  selectedGuests: string[]
  onGuestsChange: (guestIds: string[]) => void
  onNext: () => void
  onBack: () => void
}

export default function GuestSelector({
  tournamentId,
  selectedGuests,
  onGuestsChange,
  onNext,
  onBack
}: GuestSelectorProps) {
  const [loading, setLoading] = useState(true)
  const [groupMembers, setGroupMembers] = useState<Player[]>([])
  const [externalGuests, setExternalGuests] = useState<Player[]>([])

  useEffect(() => {
    loadAvailableGuests()
  }, [tournamentId])

  const loadAvailableGuests = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/players/available-guests?tournamentId=${tournamentId}`)
      
      if (response.ok) {
        const data = await response.json()
        setGroupMembers(data.groupMembers)
        setExternalGuests(data.externalGuests)
      }
    } catch (error) {
      console.error('Error loading guests:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGuest = (guestId: string) => {
    if (selectedGuests.includes(guestId)) {
      onGuestsChange(selectedGuests.filter(id => id !== guestId))
    } else {
      onGuestsChange([...selectedGuests, guestId])
    }
  }

  if (loading) {
    return (
      <Card className="bg-poker-card border-white/10">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-poker-card border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <UserPlus className="w-5 h-5" />
          Agregar Invitados ({selectedGuests.length} seleccionados)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-poker-dark/30 p-3 rounded-lg">
          <p className="text-xs text-poker-muted">
            💡 Puedes invitar miembros del grupo que no están registrados en el torneo 
            o invitados externos ya registrados en el sistema.
          </p>
        </div>

        {/* Miembros del Grupo */}
        {groupMembers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4" />
              Miembros del Grupo ({groupMembers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {groupMembers.map((member) => (
                <label
                  key={member.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedGuests.includes(member.id)
                      ? 'bg-poker-red/20 border-poker-red'
                      : 'bg-poker-dark/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGuests.includes(member.id)}
                    onChange={() => toggleGuest(member.id)}
                    className="rounded border-gray-300 text-poker-red focus:ring-poker-red"
                  />
                  <div className="flex items-center space-x-2">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-300">
                          {member.firstName[0]}{member.lastName[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-poker-cyan">
                        {member.role === UserRole.Comision ? 'Comisión' : 'Enfermo'}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Invitados Externos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Invitados Externos ({externalGuests.length})
            </h3>
            <Link href="/players/new">
              <Button
                variant="outline"
                size="sm"
                className="border-poker-cyan/30 text-poker-cyan hover:bg-poker-cyan/10"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Nuevo Invitado
              </Button>
            </Link>
          </div>

          {externalGuests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {externalGuests.map((guest) => (
                <label
                  key={guest.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedGuests.includes(guest.id)
                      ? 'bg-poker-red/20 border-poker-red'
                      : 'bg-poker-dark/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGuests.includes(guest.id)}
                    onChange={() => toggleGuest(guest.id)}
                    className="rounded border-gray-300 text-poker-red focus:ring-poker-red"
                  />
                  <div className="flex items-center space-x-2">
                    {guest.photoUrl ? (
                      <img
                        src={guest.photoUrl}
                        alt={`${guest.firstName} ${guest.lastName}`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-300">
                          {guest.firstName[0]}{guest.lastName[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {guest.firstName} {guest.lastName}
                      </p>
                      {guest.inviter && (
                        <p className="text-xs text-poker-muted">
                          Invitado por {guest.inviter.firstName}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-poker-muted">
              <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay invitados externos registrados</p>
              <Link href="/players/new">
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-poker-cyan/30 text-poker-cyan hover:bg-poker-cyan/10"
                >
                  Crear Nuevo Invitado
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex space-x-4 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 bg-poker-red hover:bg-red-700 text-white"
          >
            Continuar a Confirmación
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}