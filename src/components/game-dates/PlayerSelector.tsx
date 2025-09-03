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
  selectedPlayers: string[]
  onPlayersChange: (playerIds: string[]) => void
  onNext: () => void
  onBack: () => void
}

export default function PlayerSelector({
  players,
  selectedPlayers,
  onPlayersChange,
  onNext,
  onBack
}: PlayerSelectorProps) {
  const togglePlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      onPlayersChange(selectedPlayers.filter(id => id !== playerId))
    } else {
      onPlayersChange([...selectedPlayers, playerId])
    }
  }

  const selectAll = () => {
    onPlayersChange(players.map(p => p.id))
  }

  const deselectAll = () => {
    onPlayersChange([])
  }

  return (
    <Card className="bg-poker-card border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          Seleccionar Jugadores ({selectedPlayers.length} de {players.length})
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="border-white/20 text-poker-text hover:bg-white/5"
          >
            Seleccionar Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deselectAll}
            className="border-white/20 text-poker-text hover:bg-white/5"
          >
            Deseleccionar Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-poker-dark/30 p-3 rounded-lg">
          <p className="text-xs text-poker-muted">
            💡 Todos los jugadores registrados en el torneo están seleccionados por defecto. 
            Desmarca solo los que no pueden asistir a esta fecha.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {players.map((player) => (
            <label
              key={player.id}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all border ${
                selectedPlayers.includes(player.id)
                  ? 'bg-poker-red/20 border-poker-red'
                  : 'bg-poker-dark/50 border-white/10 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPlayers.includes(player.id)}
                onChange={() => togglePlayer(player.id)}
                className="rounded border-gray-300 text-poker-red focus:ring-poker-red"
              />
              <div className="flex items-center space-x-2">
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-300">
                      {player.firstName[0]}{player.lastName[0]}
                    </span>
                  </div>
                )}
                <span className="text-white font-medium">
                  {player.firstName} {player.lastName}
                </span>
              </div>
            </label>
          ))}
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
            Continuar a Invitados
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}