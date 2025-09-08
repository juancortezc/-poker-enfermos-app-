'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, ChevronLeft, ChevronRight, Users, ExternalLink } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { useAuth } from '@/contexts/AuthContext'
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
  selectedPlayers: string[]
  selectedGuests: string[]
  onGuestsChange: (guestIds: string[]) => void
  onNext: () => void
  onBack: () => void
  nextButtonText?: string
  nextButtonIcon?: React.ReactNode
}

export default function GuestSelector({
  tournamentId,
  selectedPlayers,
  selectedGuests,
  onGuestsChange,
  onNext,
  onBack,
  nextButtonText = "Continuar a Confirmación",
  nextButtonIcon = <ChevronRight className="w-4 h-4 ml-2" />
}: GuestSelectorProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [groupMembers, setGroupMembers] = useState<Player[]>([])
  const [externalGuests, setExternalGuests] = useState<Player[]>([])

  useEffect(() => {
    loadAvailableGuests()
  }, [tournamentId])

  // Prevent auto-scroll to bottom when component mounts
  useEffect(() => {
    const preventScroll = (e: Event) => {
      e.preventDefault()
      return false
    }
    
    // Store current scroll position
    const currentScrollY = window.scrollY
    
    // After component mounts, restore scroll position
    const timer = setTimeout(() => {
      window.scrollTo(0, currentScrollY)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const loadAvailableGuests = async () => {
    try {
      setLoading(true)
      
      if (!user?.adminKey) {
        setLoading(false)
        return
      }
      
      const response = await fetch(`/api/players/available-guests?tournamentId=${tournamentId}`, {
        headers: {
          'Authorization': `Bearer ${user.adminKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGroupMembers(data.groupMembers || [])
        setExternalGuests(data.externalGuests || [])
      } else {
        const errorText = await response.text()
      }
    } catch (error) {
      // Error loading guests
    } finally {
      setLoading(false)
    }
  }

  const toggleGuest = (guestId: string) => {
    if (selectedGuests.includes(guestId)) {
      const newGuests = selectedGuests.filter(id => id !== guestId)
      onGuestsChange(newGuests)
    } else {
      const newGuests = [...selectedGuests, guestId]
      onGuestsChange(newGuests)
    }
  }

  // Filter invitados whose inviter is playing
  const getAvailableInvitados = (invitados: Player[]) => {
    return invitados.filter(invitado => {
      // If no inviter info, allow selection (for backward compatibility)
      if (!invitado.inviter) return true
      
      // Find the inviter in the available players data
      const allPlayers = [...groupMembers, ...externalGuests]
      const inviter = allPlayers.find(p => 
        p.firstName === invitado.inviter?.firstName && 
        p.lastName === invitado.inviter?.lastName
      )
      
      // If inviter found, check if they're selected to play
      if (inviter) {
        return selectedPlayers.includes(inviter.id)
      }
      
      // If inviter not found in current data, allow selection
      return true
    })
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
          Invitados ({selectedGuests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Miembros del Grupo */}
        {groupMembers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">
              Del Grupo ({getAvailableInvitados(groupMembers).length} de {groupMembers.length})
            </h3>
            {getAvailableInvitados(groupMembers).length > 0 ? (
              <div className="bg-poker-dark/30 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-white/10">
                  {getAvailableInvitados(groupMembers).map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center px-2 py-1 cursor-pointer transition-all bg-poker-dark/50 hover:bg-poker-dark/70"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGuests.includes(member.id)}
                        onChange={() => toggleGuest(member.id)}
                        className="mr-2 rounded-sm border-gray-400 text-poker-red focus:ring-poker-red w-3 h-3 accent-poker-red"
                      />
                      <span className="text-white text-xs truncate">
                        {member.firstName} {member.lastName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-poker-muted">
                <p className="text-sm">Sus invitadores no están confirmados para jugar</p>
              </div>
            )}
          </div>
        )}

        {/* Invitados Externos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">
              Externos ({getAvailableInvitados(externalGuests).length} de {externalGuests.length})
            </h3>
            <Link href="/players/new?type=invitado&returnTo=/game-dates/new" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="border-pink-400/30 text-pink-400 hover:bg-pink-400/10"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Nuevo
              </Button>
            </Link>
          </div>

          {getAvailableInvitados(externalGuests).length > 0 ? (
            <div className="bg-poker-dark/30 rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 gap-px bg-white/10">
                {getAvailableInvitados(externalGuests).map((guest) => (
                  <label
                    key={guest.id}
                    className="flex items-center px-2 py-1 cursor-pointer transition-all bg-poker-dark/50 hover:bg-poker-dark/70"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGuests.includes(guest.id)}
                      onChange={() => toggleGuest(guest.id)}
                      className="mr-2 rounded-sm border-gray-400 text-pink-400 focus:ring-pink-400 w-3 h-3 accent-pink-400"
                    />
                    <span className="text-white text-xs truncate">
                      {guest.firstName} {guest.lastName}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-poker-muted">
              <p className="text-sm">
                {externalGuests.length === 0 
                  ? 'No hay externos registrados' 
                  : 'No hay invitados disponibles (sus invitadores no están confirmados)'}
              </p>
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
            {nextButtonText}
            {nextButtonIcon}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}