'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { UserRole } from '@prisma/client'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  photoUrl?: string
  isActive: boolean
}

interface PlayerSelectorProps {
  players: Player[]
  additionalPlayers?: Player[]
  selectedPlayers: string[]
  onPlayersChange: (playerIds: string[]) => void
  onNext: () => void
  onBack: () => void
  nextButtonText?: string
  nextButtonIcon?: React.ReactNode
}

export default function PlayerSelector({
  players,
  additionalPlayers = [],
  selectedPlayers,
  onPlayersChange,
  onNext,
  onBack,
  nextButtonText = "Continuar a Invitados",
  nextButtonIcon = <ChevronRight className="w-4 h-4 ml-2" />
}: PlayerSelectorProps) {
  const togglePlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      onPlayersChange(selectedPlayers.filter(id => id !== playerId))
    } else {
      onPlayersChange([...selectedPlayers, playerId])
    }
  }


  return (
    <Card className="bg-poker-card border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          Seleccionar Jugadores ({selectedPlayers.length} de {players.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Jugadores del Torneo */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white">
            Jugadores del Torneo ({players.length})
          </h3>
          <div className="bg-poker-dark/30 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-white/10">
              {players.map((player) => (
                <label
                  key={player.id}
                  className="flex items-center px-2 py-1 cursor-pointer transition-all bg-poker-dark/50 hover:bg-poker-dark/70"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    className="mr-2 rounded-sm border-gray-400 text-poker-red focus:ring-poker-red w-3 h-3 accent-poker-red"
                  />
                  <span className="text-white text-xs truncate">
                    {player.firstName} {player.lastName}
                  </span>
                </label>
              ))}
            </div>
          </div>
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
            disabled={selectedPlayers.length === 0}
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