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

export default function FechasTable({ tournamentId, userPin }: FechasTableProps) {
  const [completedDates, setCompletedDates] = useState<{id: number, dateNumber: number}[]>([]);
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
      const completed = tournamentData.gameDates && Array.isArray(tournamentData.gameDates)
        ? tournamentData.gameDates
            .filter((date: any) => date.status === 'completed')
            .sort((a: any, b: any) => b.dateNumber - a.dateNumber)
            .map((date: any) => ({ id: date.id, dateNumber: date.dateNumber }))
        : [];
      
      setCompletedDates(completed);
      
      // Seleccionar automáticamente la fecha más reciente
      if (completed.length > 0) {
        setSelectedDateId(completed[0].id);
      }
    }
  }, [tournamentData]);

  // Use SWR for eliminations data
  const { data: eliminationsData, error: eliminationsError, isLoading: eliminationsLoading } = useSWR(
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

  const formatTime = (timeString: string) => {
    // Formatear tiempo de eliminación si es necesario
    return timeString || '-';
  };

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

  if (completedDates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-muted text-lg">No hay fechas completadas</p>
        <p className="text-poker-muted mt-2">Las fechas aparecerán aquí una vez que se completen</p>
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
            {completedDates.map(date => (
              <option key={date.id} value={date.id}>
                Fecha {date.dateNumber}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-poker-muted pointer-events-none" />
        </div>
      </div>

      {/* Tabla de eliminaciones */}
      {selectedDateId && (
        <div className="overflow-x-auto overflow-y-visible" style={{ backgroundColor: '#1a1a1a' }}>
          {eliminationsLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-poker-muted">Cargando eliminaciones...</div>
            </div>
          ) : eliminations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-poker-muted">No hay eliminaciones registradas para esta fecha</p>
            </div>
          ) : (
            <table className="excel-table w-full min-w-[600px]" style={{ backgroundColor: 'white' }}>
              <thead>
                <tr>
                  <th className="excel-header-gray" style={{color: '#000'}}>POS</th>
                  <th className="excel-header" style={{color: '#000'}}>ENFERMO</th>
                  <th className="excel-header" style={{color: '#000'}}>VACUNADO POR</th>
                  <th className="excel-header excel-header-total" style={{color: '#000'}}>PUNTOS</th>
                </tr>
              </thead>
              <tbody>
                {eliminations.map((elimination, index) => (
                  <tr key={elimination.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="excel-cell excel-cell-gray text-center font-medium" style={{color: '#000'}}>
                      {elimination.position}
                    </td>
                    <td className="excel-cell text-left" style={{color: '#000'}}>
                      {getPlayerName(elimination.eliminatedPlayer)}
                    </td>
                    <td className="excel-cell text-left" style={{color: '#000'}}>
                      {elimination.position === 1 
                        ? '-'
                        : elimination.eliminatorPlayer 
                          ? getPlayerName(elimination.eliminatorPlayer) 
                          : '-'
                      }
                    </td>
                    <td className="excel-cell excel-cell-total text-center font-bold" style={{color: '#000'}}>
                      {elimination.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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