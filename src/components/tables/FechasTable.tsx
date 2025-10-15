'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface Elimination {
  id: string;
  position: number;
  eliminatedPlayerId: string;
  eliminatorPlayerId?: string | null;
  points: number;
  eliminationTime: string;
  eliminatedPlayer: Player;
  eliminatorPlayer?: Player | null;
}

interface FechasTableProps {
  tournamentId: number;
  userPin?: string | null;
}

type AvailableDate = {
  id: number;
  dateNumber: number;
  status: string;
}

export default function FechasTable({ tournamentId }: FechasTableProps) {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDateId, setSelectedDateId] = useState<number | null>(null);
  const [eliminations, setEliminations] = useState<Elimination[]>([]);

  // Use SWR for tournament data with PIN authentication
  const { data: tournamentData, error: tournamentError, isLoading: tournamentLoading } = useSWR(
    `/api/tournaments/${tournamentId}`,
    fetcher,
    { refreshInterval: 60000 } // 1 minute refresh
  );

  // Process tournament data when loaded
  useEffect(() => {
    if (tournamentData) {
      // Filtrar fechas completadas y ordenarlas por dateNumber descendente
      const dates = tournamentData.gameDates && Array.isArray(tournamentData.gameDates)
        ? tournamentData.gameDates
            .filter((date: { status: string }) => ['completed', 'in_progress'].includes(date.status))
            .sort((a: { dateNumber: number }, b: { dateNumber: number }) => b.dateNumber - a.dateNumber)
            .map((date: { id: number; dateNumber: number; status: string }) => ({
              id: date.id,
              dateNumber: date.dateNumber,
              status: date.status
            }))
        : [];

      setAvailableDates(dates);

      if (dates.length > 0) {
        const activeDate = dates.find(date => date.status === 'in_progress') || dates[0];
        setSelectedDateId(currentId => {
          if (currentId && dates.some(date => date.id === currentId)) {
            return currentId;
          }
          return activeDate.id;
        });
      } else {
        setSelectedDateId(null);
      }
    }
  }, [tournamentData]);

  // Use SWR for eliminations data
  const { data: eliminationsData, isLoading: eliminationsLoading } = useSWR(
    selectedDateId ? `/api/eliminations/game-date/${selectedDateId}` : null,
    fetcher,
    { refreshInterval: 30000 } // 30 seconds refresh
  );

  // Process eliminations data when loaded
  useEffect(() => {
    if (eliminationsData) {
      // Ordenar por posición ascendente (1, 2, 3, 4...)
      const sortedEliminations = eliminationsData.sort((a: Elimination, b: Elimination) => a.position - b.position);
      setEliminations(sortedEliminations);
    } else if (!eliminationsLoading) {
      setEliminations([]);
    }
  }, [eliminationsData, eliminationsLoading]);

  // TODO: Re-enable time formatting when needed

  const getPlayerName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`;
  };

  if (tournamentLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-poker-muted">Cargando fechas...</div>
      </div>
    );
  }

  if (tournamentError) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-red-400">Error al cargar fechas: {tournamentError.message}</div>
      </div>
    );
  }

  if (availableDates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-muted text-lg">No hay fechas disponibles</p>
        <p className="text-poker-muted mt-2">Las eliminaciones se mostrarán aquí cuando se registre una fecha.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Dropdown para selección de fecha */}
      <div className="flex justify-center">
        <div className="relative">
          <select
            value={selectedDateId || ''}
            onChange={(e) => setSelectedDateId(parseInt(e.target.value))}
            className="
              appearance-none bg-poker-card border border-white/20 rounded-lg 
              px-4 py-3 pr-10 text-white font-medium min-w-[200px]
              hover:border-white/30 focus:border-poker-red focus:outline-none
              transition-colors duration-200
            "
          >
            <option value="">Seleccionar Fecha</option>
            {availableDates.map(date => (
              <option key={date.id} value={date.id}>
                {`Fecha ${date.dateNumber}${date.status === 'in_progress' ? ' (En curso)' : ''}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-poker-muted pointer-events-none" />
        </div>
      </div>

      {/* Lista de eliminaciones - estilo Registro */}
      {selectedDateId && (
        <div className="bg-poker-card rounded-lg border border-white/10">
          <div className="p-6">
            <h3 className="text-white font-semibold mb-4">Eliminaciones</h3>

            {eliminationsLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-poker-muted">Cargando eliminaciones...</div>
              </div>
            ) : eliminations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-poker-muted">No hay eliminaciones registradas para esta fecha</p>
              </div>
            ) : (
              <div className="space-y-2">
                {eliminations.map((elimination) => (
                  <div
                    key={elimination.id}
                    className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="w-6 text-center">
                        <span className="text-white font-bold text-sm">{elimination.position}</span>
                      </div>
                      <div className="flex-1 text-white text-sm">
                        <span className="truncate block">
                          {getPlayerName(elimination.eliminatedPlayer)}
                          {elimination.position !== 1 && (
                            <span className="text-poker-muted">
                              {' vs '}
                              {elimination.eliminatorPlayer ?
                                getPlayerName(elimination.eliminatorPlayer) :
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Información adicional */}
      {selectedDateId && eliminations.length > 0 && (
        <div className="flex justify-center">
          <div className="text-poker-muted text-sm">
            {eliminations.length} eliminacion{eliminations.length !== 1 ? 'es' : ''} registrada{eliminations.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
