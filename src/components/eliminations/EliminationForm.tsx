'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { calculatePointsForPosition } from '@/lib/tournament-utils';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface EliminationFormProps {
  gameDateId: string;
  nextPosition: number;
  activePlayers: Player[];
  totalPlayers: number;
  onSave: () => void;
}

export default function EliminationForm({
  gameDateId,
  nextPosition,
  activePlayers,
  totalPlayers,
  onSave
}: EliminationFormProps) {
  const [eliminatedId, setEliminatedId] = useState('');
  const [eliminatorId, setEliminatorId] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Calcular puntos para esta posición
  const points = calculatePointsForPosition(nextPosition, totalPlayers);

  // Reset form cuando cambia la posición
  useEffect(() => {
    setEliminatedId('');
    setEliminatorId('');
  }, [nextPosition]);

  // Filtrar eliminadores disponibles (no puede ser el mismo que el eliminado)
  const availableEliminators = activePlayers.filter(p => p.id !== eliminatedId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eliminatedId) {
      toast.error('Selecciona un jugador eliminado');
      return;
    }

    // Solo requerir eliminador si no es la posición 2
    if (nextPosition > 2 && !eliminatorId) {
      toast.error('Selecciona un vacunador');
      return;
    }

    setSaving(true);
    
    try {
      const adminKey = localStorage.getItem('adminKey');
      const res = await fetch('/api/eliminations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`
        },
        body: JSON.stringify({
          gameDateId,
          position: nextPosition,
          eliminatedId,
          eliminatorId: eliminatorId || null
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar eliminación');
      }

      toast.success('Eliminación guardada');
      onSave();
    } catch (error) {
      console.error('Error saving elimination:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Si es posición 1, no mostrar el formulario
  if (nextPosition < 1) {
    return (
      <div className="bg-poker-card border border-white/10 rounded-lg p-6 text-center">
        <p className="text-white text-lg">¡Fecha completada!</p>
        <p className="text-poker-muted mt-2">Todas las eliminaciones han sido registradas.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-poker-card border border-white/10 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Posición */}
        <div>
          <label className="block text-sm text-poker-muted mb-1">POS</label>
          <div className="bg-poker-black/50 border border-white/10 rounded-lg p-3 text-white text-center font-bold text-lg">
            {nextPosition}
          </div>
        </div>

        {/* Puntos */}
        <div>
          <label className="block text-sm text-poker-muted mb-1">PUNTOS</label>
          <div className="bg-poker-black/50 border border-white/10 rounded-lg p-3 text-poker-gold text-center font-bold text-lg">
            {points}
          </div>
        </div>
      </div>

      {/* Jugador Eliminado */}
      <div className="mb-4">
        <label className="block text-sm text-poker-muted mb-1">ELIMINADO</label>
        <select
          value={eliminatedId}
          onChange={(e) => setEliminatedId(e.target.value)}
          className="w-full bg-poker-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-poker-accent"
          disabled={saving}
        >
          <option value="">Seleccionar jugador</option>
          {activePlayers.map(player => (
            <option key={player.id} value={player.id}>
              {player.firstName} {player.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Vacunador - No mostrar en posición 2 */}
      {nextPosition > 2 && (
        <div className="mb-4">
          <label className="block text-sm text-poker-muted mb-1">VACUNADOR</label>
          <select
            value={eliminatorId}
            onChange={(e) => setEliminatorId(e.target.value)}
            className="w-full bg-poker-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-poker-accent"
            disabled={saving || !eliminatedId}
          >
            <option value="">Seleccionar vacunador</option>
            {availableEliminators.map(player => (
              <option key={player.id} value={player.id}>
                {player.firstName} {player.lastName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mensaje especial para posición 2 */}
      {nextPosition === 2 && (
        <div className="bg-poker-gold/10 border border-poker-gold/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-poker-gold">
            Al registrar esta eliminación, el vacunador será declarado ganador automáticamente.
          </p>
        </div>
      )}

      {/* Botón Guardar */}
      <button
        type="submit"
        disabled={saving || !eliminatedId || (nextPosition > 2 && !eliminatorId)}
        className="w-full bg-poker-accent hover:bg-poker-accent-hover disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        {saving ? 'Guardando...' : 'GUARDAR'}
      </button>
    </form>
  );
}