'use client';

import { useState, useEffect } from 'react';
import { useTournamentRanking } from '@/hooks/useTournamentRanking';

interface TotalTableProps {
  tournamentId: number;
  userPin?: string | null;
}

export default function TotalTable({ tournamentId }: TotalTableProps) {
  const [completedDates, setCompletedDates] = useState<number[]>([]);

  // Use SWR hook for ranking data with PIN authentication
  const { 
    ranking: rankingData, 
    isLoading: loading, 
    isError,
    errorMessage
  } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000 // 30 seconds refresh
  });

  // Extract completed dates when data is loaded
  useEffect(() => {
    if (rankingData && rankingData.rankings.length > 0) {
      const dateNumbers = Object.keys(rankingData.rankings[0].pointsByDate || {})
        .map(Number)
        .filter(dateNumber => dateNumber > 0)
        .sort((a, b) => a - b); // Orden ascendente: F1, F2, F3, F4, F5
      setCompletedDates(dateNumbers);
    }
  }, [rankingData]);

  // Función para formatear nombre según espacio disponible
  const formatPlayerName = (name: string, availableSpace: 'full' | 'medium' | 'short') => {
    const parts = name.split(' ').filter(part => part.trim().length > 0);
    
    switch (availableSpace) {
      case 'full':
        return name;
      case 'medium':
        if (parts.length >= 2) {
          return `${parts[0]} ${parts[parts.length - 1][0]}.`;
        }
        return parts[0] || name;
      case 'short':
        return parts[0] || name;
      default:
        return name;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-poker-muted">Cargando datos...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-red-400">Error: {errorMessage}</div>
      </div>
    );
  }

  if (!rankingData || completedDates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-muted">No hay fechas completadas disponibles</p>
      </div>
    );
  }

  // Determinar formato de nombre basado en número de fechas
  const nameFormat = completedDates.length > 8 ? 'short' : completedDates.length > 5 ? 'medium' : 'full';

  return (
    <div className="w-full">
      <div className="overflow-x-auto overflow-y-visible" style={{ backgroundColor: '#1a1a1a' }}>
        <table className="excel-table w-full min-w-[1000px]" style={{ backgroundColor: 'white' }}>
          <thead>
            <tr>
              <th className="excel-header-gray sticky-col" style={{color: '#000'}}>POS</th>
              <th className="excel-header sticky-col" style={{color: '#000'}}>JUGADOR</th>
              <th className="excel-header excel-header-total sticky-col" style={{color: '#000'}}>FINAL</th>
              {completedDates.map(dateNumber => (
                <th key={dateNumber} className="excel-header date-header" style={{color: '#000'}}>
                  F{dateNumber}
                </th>
              ))}
              <th className="excel-header" style={{color: '#b91c1c'}}>E1</th>
              <th className="excel-header" style={{color: '#b91c1c'}}>E2</th>
              <th className="excel-header excel-header-total" style={{color: '#000'}}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rankingData.rankings.map((player, index) => (
              <tr key={player.playerId} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="excel-cell excel-cell-gray text-center font-medium" style={{color: '#000'}}>
                  <span className={`position-badge ${
                    player.position === 1 ? 'position-1st' : 
                    player.position === 2 ? 'position-2nd' :
                    player.position === 3 ? 'position-3rd' : ''
                  }`}>
                    {player.position}
                  </span>
                </td>
                <td className="excel-cell text-left sticky-col" style={{color: '#000'}}>
                  {formatPlayerName(player.playerName, nameFormat)}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold score-emphasis" style={{color: '#1a365d'}}>
                  {player.finalScore !== undefined ? player.finalScore : '-'}
                </td>
                {completedDates.map(dateNumber => (
                  <td key={dateNumber} className="excel-cell text-center date-cell" style={{color: '#000'}}>
                    {player.pointsByDate[dateNumber] || 0}
                  </td>
                ))}
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {player.elimina1 !== undefined ? player.elimina1 : '-'}
                </td>
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {player.elimina2 !== undefined ? player.elimina2 : '-'}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold score-emphasis" style={{color: '#1a365d'}}>
                  {player.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
