'use client';

import { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDate } from '@/lib/utils';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface Elimination {
  id: string;
  position: number;
  points: number;
  eliminationTime: string;
  eliminatedPlayer: Player;
  eliminatorPlayer: Player | null;
}

interface EliminationTableProps {
  eliminations: Elimination[];
  gameDateId: string;
  onUpdate: () => void;
}

export default function EliminationTable({
  eliminations,
  gameDateId,
  onUpdate
}: EliminationTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    eliminatedId: '',
    eliminatorId: ''
  });
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [saving, setSaving] = useState(false);

  const startEdit = async (elimination: Elimination) => {
    setEditingId(elimination.id);
    setEditForm({
      eliminatedId: elimination.eliminatedPlayer.id,
      eliminatorId: elimination.eliminatorPlayer?.id || ''
    });

    // Obtener jugadores disponibles para esta posición
    try {
      const res = await fetch(`/api/game-dates/${gameDateId}/players`);
      if (res.ok) {
        const players = await res.json();
        
        // Filtrar jugadores que no han sido eliminados en posiciones mayores (eliminados antes)
        const eliminatedBefore = eliminations
          .filter(e => e.position > elimination.position)
          .map(e => e.eliminatedPlayer.id);
        
        const available = players.filter((p: Player) => !eliminatedBefore.includes(p.id));
        setAvailablePlayers(available);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ eliminatedId: '', eliminatorId: '' });
    setAvailablePlayers([]);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const adminKey = localStorage.getItem('adminKey');
      const res = await fetch(`/api/eliminations/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`
        },
        body: JSON.stringify({
          eliminatedId: editForm.eliminatedId,
          eliminatorId: editForm.eliminatorId || null
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al actualizar');
      }

      toast.success('Eliminación actualizada');
      cancelEdit();
      onUpdate();
    } catch (error) {
      console.error('Error updating elimination:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar eliminadores disponibles
  const availableEliminators = availablePlayers.filter(p => p.id !== editForm.eliminatedId);

  if (eliminations.length === 0) {
    return (
      <div className="bg-poker-card/50 border border-white/10 rounded-lg p-6 text-center">
        <p className="text-poker-muted">No hay eliminaciones registradas</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sm:table-header-group hidden">
          <tr className="border-b border-white/10">
            <th className="text-left py-2 text-poker-muted">Pos</th>
            <th className="text-left py-2 text-poker-muted">Eliminado</th>
            <th className="text-left py-2 text-poker-muted">Vacunador</th>
            <th className="text-left py-2 text-poker-muted">Puntos</th>
            <th className="text-left py-2 text-poker-muted">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {eliminations.map((elimination) => {
            const isEditing = editingId === elimination.id;
            
            return (
              <tr key={elimination.id} className="border-b border-white/5">
                {/* Mobile view */}
                <td className="py-3 sm:hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-white font-bold mr-2">{elimination.position}.</span>
                      {isEditing ? (
                        <select
                          value={editForm.eliminatedId}
                          onChange={(e) => setEditForm({ ...editForm, eliminatedId: e.target.value })}
                          className="bg-poker-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm"
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
                      
                      {elimination.eliminatorPlayer && (
                        <>
                          <span className="text-poker-muted mx-1">←</span>
                          {isEditing ? (
                            <select
                              value={editForm.eliminatorId}
                              onChange={(e) => setEditForm({ ...editForm, eliminatorId: e.target.value })}
                              className="bg-poker-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm"
                            >
                              <option value="">Sin vacunador</option>
                              {availableEliminators.map(player => (
                                <option key={player.id} value={player.id}>
                                  {player.firstName} {player.lastName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-poker-muted">
                              {elimination.eliminatorPlayer.firstName} {elimination.eliminatorPlayer.lastName}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-poker-gold font-bold">{elimination.points}</span>
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="text-green-400 p-1"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="text-red-400 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(elimination)}
                          className="text-poker-accent p-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {/* Desktop view */}
                <td className="py-2 text-white font-bold hidden sm:table-cell">
                  {elimination.position}
                </td>
                <td className="py-2 hidden sm:table-cell">
                  {isEditing ? (
                    <select
                      value={editForm.eliminatedId}
                      onChange={(e) => setEditForm({ ...editForm, eliminatedId: e.target.value })}
                      className="bg-poker-black/50 border border-white/10 rounded px-2 py-1 text-white"
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
                </td>
                <td className="py-2 hidden sm:table-cell">
                  {isEditing ? (
                    <select
                      value={editForm.eliminatorId}
                      onChange={(e) => setEditForm({ ...editForm, eliminatorId: e.target.value })}
                      className="bg-poker-black/50 border border-white/10 rounded px-2 py-1 text-white"
                    >
                      <option value="">Sin vacunador</option>
                      {availableEliminators.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-poker-muted">
                      {elimination.eliminatorPlayer 
                        ? `${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}`
                        : '-'
                      }
                    </span>
                  )}
                </td>
                <td className="py-2 text-poker-gold font-bold hidden sm:table-cell">
                  {elimination.points}
                </td>
                <td className="py-2 hidden sm:table-cell">
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
                      className="text-poker-accent hover:text-poker-accent-hover p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}