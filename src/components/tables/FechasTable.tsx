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
        const activeDate = dates.find((date: AvailableDate) => date.status === 'in_progress') || dates[0];
        setSelectedDateId(currentId => {
          if (currentId && dates.some((date: AvailableDate) => date.id === currentId)) {
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

  const getPlayerName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`;
  };

  if (tournamentLoading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando fechas...</div>
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
      <div className="text-center py-8 px-4">
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay fechas disponibles
        </p>
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)', marginTop: '8px' }}>
          Las eliminaciones se mostrarán aquí cuando se registre una fecha.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4" style={{ background: 'var(--cp-background)' }}>
      {/* Date Selector - CleanPoker style */}
      <div className="flex justify-center">
        <div className="relative">
          <select
            value={selectedDateId || ''}
            onChange={(e) => setSelectedDateId(parseInt(e.target.value))}
            className="appearance-none rounded px-4 py-3 pr-10 font-medium min-w-[200px] cursor-pointer transition-all"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
            }}
          >
            {availableDates.map(date => (
              <option key={date.id} value={date.id} style={{ background: '#1a1a1a' }}>
                Fecha {date.dateNumber}{date.status === 'in_progress' ? ' (En curso)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          />
        </div>
      </div>

      {/* Eliminations Card - CleanPoker style */}
      {selectedDateId && (
        <div
          className="rounded-2xl"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <div className="p-4">
            <h3
              className="font-semibold mb-4"
              style={{
                color: 'var(--cp-on-surface)',
                fontSize: 'var(--cp-body-size)',
              }}
            >
              Eliminaciones
            </h3>

            {eliminationsLoading ? (
              <div className="flex justify-center py-8">
                <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando eliminaciones...</div>
              </div>
            ) : eliminations.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
                  No hay eliminaciones registradas para esta fecha
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {eliminations.map((elimination) => (
                  <div
                    key={elimination.id}
                    className="flex items-center justify-between py-3 px-3 rounded-xl transition-colors"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Position */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
                        style={{
                          background: elimination.position === 1 ? '#E5393520' : 'rgba(255, 255, 255, 0.08)',
                          color: elimination.position === 1 ? '#E53935' : 'var(--cp-on-surface)',
                          fontSize: 'var(--cp-caption-size)',
                        }}
                      >
                        {elimination.position}
                      </div>

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <span
                          className="truncate font-medium"
                          style={{
                            color: 'var(--cp-on-surface)',
                            fontSize: 'var(--cp-caption-size)',
                          }}
                        >
                          {getPlayerName(elimination.eliminatedPlayer)}
                          {elimination.position !== 1 && (
                            <span
                              style={{
                                color: 'var(--cp-on-surface-muted)',
                              }}
                            >
                              {' '}vs {elimination.eliminatorPlayer ? getPlayerName(elimination.eliminatorPlayer) : 'N/A'}
                            </span>
                          )}
                          {elimination.position === 1 && (
                            <span
                              style={{
                                color: '#E53935',
                              }}
                            >
                              {' '}- Ganador
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Points */}
                      <div
                        className="px-2 py-1 rounded-lg font-semibold"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--cp-on-surface)',
                          fontSize: 'var(--cp-caption-size)',
                        }}
                      >
                        {elimination.points}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer info */}
      {selectedDateId && eliminations.length > 0 && (
        <div className="text-center pt-2">
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            {eliminations.length} eliminacion{eliminations.length !== 1 ? 'es' : ''} registrada{eliminations.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
