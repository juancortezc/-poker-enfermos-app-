interface Elimination {
  id: number
  position: number
  eliminatedPlayerId: string
  eliminatorPlayerId: string | null
  points: number
  createdAt: string
  eliminatedPlayer: {
    id: string
    firstName: string
    lastName: string
  }
}

interface RecentEliminationsTableProps {
  eliminations: Elimination[]
  isLoading?: boolean
}

export function RecentEliminationsTable({ eliminations, isLoading }: RecentEliminationsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-poker-card border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>📋</span>
          Eliminaciones Recientes
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 bg-white/10 rounded"></div>
              <div className="h-4 bg-white/10 rounded flex-1"></div>
              <div className="w-12 h-4 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (eliminations.length === 0) {
    return (
      <div className="bg-poker-card border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>📋</span>
          Eliminaciones Recientes
        </h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-poker-muted">Sin eliminaciones aún</div>
        </div>
      </div>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400' // Ganador
    if (position <= 3) return 'text-orange-400'  // Top 3
    return 'text-white'
  }

  return (
    <div className="bg-poker-card border border-white/10 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>📋</span>
        Eliminaciones Recientes ({eliminations.length})
      </h3>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {eliminations.map((elimination) => (
          <div 
            key={elimination.id} 
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
          >
            {/* Posición */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border ${
              elimination.position === 1 
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                : elimination.position <= 3
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                : 'bg-white/10 border-white/20 text-white'
            }`}>
              #{elimination.position}
            </div>
            
            {/* Información del jugador */}
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate ${getPositionColor(elimination.position)}`}>
                {elimination.eliminatedPlayer.firstName} {elimination.eliminatedPlayer.lastName}
              </div>
              <div className="text-xs text-poker-muted">
                {formatTime(elimination.createdAt)}
              </div>
            </div>
            
            {/* Puntos */}
            <div className="text-right">
              <div className="text-orange-400 font-bold text-sm">
                {elimination.points} pts
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}