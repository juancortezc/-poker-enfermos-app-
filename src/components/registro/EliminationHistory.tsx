import { useState } from 'react'
import { Edit2, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Player {
  id: string
  firstName: string
  lastName: string
}

interface Elimination {
  id: string
  position: number
  eliminatedPlayerId: string
  eliminatorPlayerId?: string | null
  points: number
  eliminatedPlayer: Player
  eliminatorPlayer?: Player | null
}

interface EliminationHistoryProps {
  eliminations: Elimination[]
  players: Player[]
  onEliminationUpdated: () => void
}

export function EliminationHistory({ 
  eliminations, 
  players, 
  onEliminationUpdated 
}: EliminationHistoryProps) {
  const { user } = useAuth()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    eliminatedPlayerId: '',
    eliminatorPlayerId: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

  if (eliminations.length === 0) {
    return null
  }

  const handleStartEdit = (elimination: Elimination) => {
    setEditingId(elimination.id)
    setEditForm({
      eliminatedPlayerId: elimination.eliminatedPlayerId,
      eliminatorPlayerId: elimination.eliminatorPlayerId || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ eliminatedPlayerId: '', eliminatorPlayerId: '' })
  }

  const handleSaveEdit = async (eliminationId: string) => {
    if (!editForm.eliminatedPlayerId) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/eliminations/${eliminationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eliminatedPlayerId: editForm.eliminatedPlayerId,
          eliminatorPlayerId: editForm.eliminatorPlayerId || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar eliminación')
      }

      handleCancelEdit()
      onEliminationUpdated()

    } catch (error) {
      console.error('Error updating elimination:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.firstName} ${player.lastName}` : 'Desconocido'
  }

  // Ordenar eliminaciones por posición descendente (más recientes primero)
  const sortedEliminations = [...eliminations].sort((a, b) => b.position - a.position)

  return (
    <div className="bg-poker-card rounded-lg border border-white/10">
      <div className="p-6">
        <h3 className="text-white font-semibold mb-4">Historial de Eliminaciones</h3>
        
        <div className="space-y-2">
          {sortedEliminations.map((elimination) => (
            <div 
              key={elimination.id} 
              className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {editingId === elimination.id ? (
                // Modo edición
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-8 text-center">
                    <span className="text-white font-bold text-lg">{elimination.position}</span>
                  </div>
                  
                  {/* Eliminado */}
                  <div className="flex-1">
                    <select
                      value={editForm.eliminatedPlayerId}
                      onChange={(e) => setEditForm({...editForm, eliminatedPlayerId: e.target.value})}
                      className="w-full bg-poker-dark border border-white/20 rounded px-3 py-1 text-white text-sm"
                      disabled={isUpdating}
                    >
                      <option value="">Seleccionar...</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Eliminador */}
                  <div className="flex-1">
                    {elimination.position === 1 ? (
                      <span className="text-poker-muted text-sm">Ganador</span>
                    ) : (
                      <select
                        value={editForm.eliminatorPlayerId}
                        onChange={(e) => setEditForm({...editForm, eliminatorPlayerId: e.target.value})}
                        className="w-full bg-poker-dark border border-white/20 rounded px-3 py-1 text-white text-sm"
                        disabled={isUpdating}
                      >
                        <option value="">Seleccionar...</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.firstName} {player.lastName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="w-8 text-center">
                    <span className="text-white font-semibold">{elimination.points}</span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSaveEdit(elimination.id)}
                      disabled={isUpdating || !editForm.eliminatedPlayerId}
                      className="p-1 text-white hover:text-poker-red transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="p-1 text-poker-muted hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <>
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-8 text-center">
                      <span className="text-white font-bold text-lg">{elimination.position}</span>
                    </div>
                    <div className="flex-1 text-white">
                      {getPlayerName(elimination.eliminatedPlayerId)}
                    </div>
                    <div className="flex-1 text-poker-muted text-sm">
                      {elimination.position === 1 ? 
                        'Ganador' : 
                        (elimination.eliminatorPlayer ? 
                          getPlayerName(elimination.eliminatorPlayerId!) : 
                          'Sin eliminador'
                        )
                      }
                    </div>
                    <div className="w-8 text-center">
                      <span className="text-white font-semibold">{elimination.points}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartEdit(elimination)}
                    className="p-2 text-poker-muted hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}