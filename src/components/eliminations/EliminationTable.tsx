'use client'

import { useState } from 'react'
import { Edit2, Check, X } from 'lucide-react'

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

interface EliminationTableProps {
  eliminations: Elimination[]
  onEliminationUpdated: () => void
}

export function EliminationTable({
  eliminations,
  onEliminationUpdated
}: EliminationTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    eliminatedId: '',
    eliminatorId: ''
  })
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [saving, setSaving] = useState(false)

  const startEdit = async (elimination: Elimination) => {
    setEditingId(elimination.id)
    setEditForm({
      eliminatedId: elimination.eliminatedPlayerId,
      eliminatorId: elimination.eliminatorPlayerId || ''
    })

    // For now, we'll use the current players from the game date
    // This would ideally be fetched from the API
    try {
      const res = await fetch(`/api/game-dates/active`)
      if (res.ok) {
        const gameDate = await res.json()
        if (gameDate) {
          const playersRes = await fetch(`/api/game-dates/${gameDate.id}/players`)
          if (playersRes.ok) {
            const players = await playersRes.json()
            setAvailablePlayers(players)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ eliminatedId: '', eliminatorId: '' })
    setAvailablePlayers([])
  }

  const saveEdit = async () => {
    if (!editingId) return

    setSaving(true)
    try {
      const adminKey = localStorage.getItem('adminKey')
      const res = await fetch(`/api/eliminations/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`
        },
        body: JSON.stringify({
          eliminatedPlayerId: editForm.eliminatedId,
          eliminatorPlayerId: editForm.eliminatorId || null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al actualizar')
      }

      cancelEdit()
      onEliminationUpdated()
    } catch (error) {
      console.error('Error updating elimination:', error)
    } finally {
      setSaving(false)
    }
  }

  // Sort eliminations by position descending (most recent first: 21, 20, 19...)
  const sortedEliminations = [...eliminations].sort((a, b) => b.position - a.position)

  // Filter available eliminators
  const availableEliminators = availablePlayers.filter(p => p.id !== editForm.eliminatedId)

  if (eliminations.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="text-white text-lg font-semibold mb-4">Historial de Eliminaciones</h3>
      
      {sortedEliminations.map((elimination) => {
        const isEditing = editingId === elimination.id
        
        return (
          <div key={elimination.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
            {/* Position */}
            <div className="text-white text-xl font-bold w-12">
              {elimination.position}
            </div>

            {/* Eliminated Player */}
            <div className="flex-1 px-4">
              {isEditing ? (
                <select
                  value={editForm.eliminatedId}
                  onChange={(e) => setEditForm({ ...editForm, eliminatedId: e.target.value })}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1"
                  disabled={saving}
                >
                  {availablePlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-white">
                  {elimination.eliminatedPlayer.firstName} {elimination.eliminatedPlayer.lastName}
                </span>
              )}
            </div>

            {/* Eliminator */}
            <div className="flex-1 px-4">
              {isEditing ? (
                <select
                  value={editForm.eliminatorId}
                  onChange={(e) => setEditForm({ ...editForm, eliminatorId: e.target.value })}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1"
                  disabled={saving}
                >
                  <option value="">Sin vacunador</option>
                  {availableEliminators.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-gray-300">
                  {elimination.eliminatorPlayer 
                    ? `${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}`
                    : '-'
                  }
                </span>
              )}
            </div>

            {/* Points - Not editable */}
            <div className="text-white font-bold w-12 text-center">
              {elimination.points}
            </div>

            {/* Actions */}
            <div className="w-12 flex justify-end">
              {isEditing ? (
                <div className="flex gap-1">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="text-green-400 hover:text-green-300 p-1"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(elimination)}
                  className="text-blue-400 hover:text-blue-300 p-1"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}