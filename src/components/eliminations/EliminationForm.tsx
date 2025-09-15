'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { calculatePointsForPosition } from '@/lib/tournament-utils'

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

interface EliminationFormProps {
  gameDate: { id: string; dateNumber: number; scheduledDate: string; status: string }
  players: Player[]
  eliminations: Elimination[]
  onEliminationSaved: () => void
  nextPosition: number
}

export function EliminationForm({
  gameDate,
  players,
  eliminations,
  onEliminationSaved,
  nextPosition
}: EliminationFormProps) {
  const [eliminatedId, setEliminatedId] = useState('')
  const [eliminatorId, setEliminatorId] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Get eliminated player IDs to filter active players
  const eliminatedPlayerIds = eliminations.map(e => e.eliminatedPlayerId)
  const activePlayers = players.filter(p => !eliminatedPlayerIds.includes(p.id))
  
  // Calculate points for this position
  const points = calculatePointsForPosition(nextPosition, players.length)
  
  // Reset form when position changes
  useEffect(() => {
    setEliminatedId('')
    setEliminatorId('')
    setSuccessMessage('')
  }, [nextPosition])

  // Filter available eliminators (cannot be the same as eliminated player)
  const availableEliminators = activePlayers.filter(p => p.id !== eliminatedId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!eliminatedId) {
      return
    }

    // Only require eliminator if not position 2
    if (nextPosition > 2 && !eliminatorId) {
      return
    }

    setSaving(true)
    
    try {
      const adminKey = localStorage.getItem('adminKey')
      const res = await fetch('/api/eliminations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`
        },
        body: JSON.stringify({
          gameDateId: gameDate.id,
          position: nextPosition,
          eliminatedPlayerId: eliminatedId,
          eliminatorPlayerId: nextPosition > 2 ? eliminatorId : null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al guardar eliminación')
      }

      setSuccessMessage('✅ Eliminación Guardada')
      setTimeout(() => {
        setSuccessMessage('')
        onEliminationSaved()
      }, 2000)
      
    } catch (error) {
      console.error('Error saving elimination:', error)
      setSuccessMessage('❌ Error al guardar')
      setTimeout(() => setSuccessMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  // If game is finished (position 1 or less)
  if (nextPosition < 1) {
    return (
      <div className="text-center text-white">
        <h3 className="text-xl font-bold mb-2">¡Fecha Completada!</h3>
        <p className="text-gray-300">Todas las eliminaciones han sido registradas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center text-white">
        <div>
          <div className="text-sm text-gray-400">Eliminado</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Vacunador</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">PTS</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-red-600 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Position */}
          <div className="text-white text-2xl font-bold">
            {nextPosition}
          </div>

          {/* Eliminated Player Selector */}
          <div className="flex-1">
            <select
              value={eliminatedId}
              onChange={(e) => setEliminatedId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white"
              disabled={saving}
            >
              <option value="">▼</option>
              {activePlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.firstName} {player.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Eliminator Selector - Only show if not position 2 */}
          {nextPosition > 2 ? (
            <div className="flex-1">
              <select
                value={eliminatorId}
                onChange={(e) => setEliminatorId(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white"
                disabled={saving || !eliminatedId}
              >
                <option value="">▼</option>
                {availableEliminators.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-white text-center">
              Auto-ganador
            </div>
          )}

          {/* Points */}
          <div className="text-white text-2xl font-bold text-center">
            {points}
          </div>

          {/* Save Button */}
          <div className="col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving || !eliminatedId || (nextPosition > 2 && !eliminatorId)}
              className="bg-red-700 hover:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </form>

      {/* Success Message */}
      {successMessage && (
        <div className="text-center text-white font-bold py-2">
          {successMessage}
        </div>
      )}

      {/* Special message for position 2 */}
      {nextPosition === 2 && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 text-yellow-200 text-sm text-center">
          Al registrar esta eliminación, el vacunador será declarado ganador automáticamente.
        </div>
      )}
    </div>
  )
}