import { useState } from 'react'
import { Edit2, Check, X } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'
import { useSWRConfig } from 'swr'
import { swrKeys } from '@/lib/swr-config'

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
  tournamentId: number
  gameDateId: number
  onEliminationUpdated: () => void
}

export function EliminationHistory({ 
  eliminations, 
  players, 
  tournamentId,
  gameDateId,
  onEliminationUpdated 
}: EliminationHistoryProps) {
  const { mutate } = useSWRConfig()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    eliminatedPlayerId: '',
    eliminatorPlayerId: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  if (eliminations.length === 0) {
    return null
  }

  const handleStartEdit = (elimination: Elimination) => {
    setEditingId(elimination.id)
    setEditForm({
      eliminatedPlayerId: elimination.eliminatedPlayerId,
      eliminatorPlayerId: elimination.eliminatorPlayerId || ''
    })
    setUpdateError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ eliminatedPlayerId: '', eliminatorPlayerId: '' })
    setUpdateError(null)
  }

  const handleSaveEdit = async (eliminationId: string) => {
    if (!editForm.eliminatedPlayerId) return
    if (editForm.eliminatorPlayerId && editForm.eliminatorPlayerId === editForm.eliminatedPlayerId) {
      setUpdateError('El eliminador no puede ser el mismo jugador eliminado')
      return
    }

    setIsUpdating(true)
    setUpdateError(null)
    try {
      const response = await fetch(`/api/eliminations/${eliminationId}`, {
        method: 'PUT',
        headers: buildAuthHeaders({}, { includeJson: true }),
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
      mutate(swrKeys.activeGameDate())
      mutate(swrKeys.activeTournament())
      mutate(swrKeys.gameDateEliminations(gameDateId))
      mutate(swrKeys.gameDate(gameDateId))
      mutate(swrKeys.gameDates(tournamentId))
      mutate(swrKeys.tournamentRanking(tournamentId))

    } catch (error) {
      console.error('Error updating elimination:', error)
      setUpdateError(error instanceof Error ? error.message : 'Error desconocido al actualizar')
    } finally {
      setIsUpdating(false)
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.firstName} ${player.lastName}` : 'Desconocido'
  }

  // Ordenar eliminaciones por posición ascendente (más recientes primero - posiciones más bajas)
  const sortedEliminations = [...eliminations].sort((a, b) => a.position - b.position)

  return (
    <div className="bg-poker-card rounded-lg border border-white/10">
      <div className="p-6">
        <h3 className="text-white font-semibold mb-4">Eliminaciones</h3>
        
        {updateError && (
          <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{updateError}</p>
          </div>
        )}

        <div className="space-y-2">
          {sortedEliminations.map((elimination) => (
            <div 
              key={elimination.id} 
              className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {editingId === elimination.id ? (
                // Modo edición
                <div className="flex items-center space-x-2 flex-1">
                  <div className="w-6 text-center">
                    <span className="text-white font-bold text-sm">{elimination.position}</span>
                  </div>
                  
                  {/* Eliminado */}
                  <div className="flex-1">
                    <select
                      value={editForm.eliminatedPlayerId}
                      onChange={(e) => setEditForm({...editForm, eliminatedPlayerId: e.target.value})}
                      className="w-full bg-poker-dark border border-white/20 rounded px-2 py-1 text-white text-xs"
                      disabled={isUpdating}
                    >
                      <option value="">Jugador...</option>
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
                      <span className="text-poker-muted text-xs">Ganador</span>
                    ) : (
                      <select
                        value={editForm.eliminatorPlayerId}
                        onChange={(e) => setEditForm({...editForm, eliminatorPlayerId: e.target.value})}
                        className="w-full bg-poker-dark border border-white/20 rounded px-2 py-1 text-white text-xs"
                        disabled={isUpdating}
                      >
                        <option value="">vs...</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.firstName} {player.lastName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="w-8 text-center">
                    <span className="text-white font-semibold text-sm">{elimination.points}</span>
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
                  <div className="flex items-center space-x-2 flex-1">
                    <div className="w-6 text-center">
                      <span className="text-white font-bold text-sm">{elimination.position}</span>
                    </div>
                    <div className="flex-1 text-white text-sm">
                      <span className="truncate block">
                        {getPlayerName(elimination.eliminatedPlayerId)}
                        {elimination.position !== 1 && (
                          <span className="text-poker-muted">
                            {' vs '}
                            {elimination.eliminatorPlayer ? 
                              getPlayerName(elimination.eliminatorPlayerId!) : 
                              'N/A'
                            }
                          </span>
                        )}
                        {elimination.position === 1 && (
                          <span className="text-poker-muted"> - Ganador</span>
                        )}
                      </span>
                    </div>
                    <div className="w-8 text-center">
                      <span className="text-white font-semibold text-sm">{elimination.points}</span>
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
