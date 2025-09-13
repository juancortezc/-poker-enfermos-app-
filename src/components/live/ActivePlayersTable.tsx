interface Player {
  id: string
  firstName: string
  lastName: string
}

interface ActivePlayersTableProps {
  activePlayers: Player[]
  isLoading?: boolean
}

export function ActivePlayersTable({ activePlayers, isLoading }: ActivePlayersTableProps) {
  if (isLoading) {
    return (
      <div className="bg-poker-card border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>👥</span>
          Jugadores Activos
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 bg-white/10 rounded-full"></div>
              <div className="h-4 bg-white/10 rounded flex-1"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (activePlayers.length === 0) {
    return (
      <div className="bg-poker-card border border-white/10 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
          <span>👥</span>
          Jugadores Activos
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-poker-muted">¡Juego terminado!</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-poker-card border border-white/10 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>👥</span>
        Jugadores Activos ({activePlayers.length})
      </h3>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activePlayers.map((player, index) => (
          <div 
            key={player.id} 
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-poker-red to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">
                {player.firstName} {player.lastName}
              </div>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )
}