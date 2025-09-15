'use client';

import { useTournamentRanking } from '@/hooks/useTournamentRanking';

interface ResumenTableProps {
  tournamentId: number;
  userPin?: string | null;
}

export default function ResumenTable({ tournamentId, userPin }: ResumenTableProps) {

  // Use SWR hook for ranking data with PIN authentication
  const { 
    ranking: rankingData, 
    isLoading: loading, 
    isError,
    errorMessage
  } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000 // 30 seconds refresh
  });

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

  if (!rankingData) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-muted">No hay datos disponibles</p>
      </div>
    );
  }

  // Obtener el número de la última fecha completada
  const lastCompletedDate = rankingData.rankings.length > 0
    ? Math.max(
        ...rankingData.rankings.flatMap(r => Object.keys(r.pointsByDate || {})).map(Number),
        0
      )
    : 0;

  // Función para formatear nombre en móvil
  const formatPlayerName = (name: string, isMobile: boolean) => {
    if (!isMobile) return name;
    
    // Formato seguro "Nombre A." 
    const parts = name.split(' ').filter(part => part.trim().length > 0);
    
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      
      // Verificar que el apellido tenga al menos una letra
      if (lastName && lastName.length > 0) {
        return `${firstName} ${lastName[0].toUpperCase()}.`;
      }
    }
    
    // Fallback: retornar solo el primer nombre o el nombre completo
    return parts[0] || name;
  };


  return (
    <div className="w-full">
      <div>
        <table className="excel-table w-full table-fixed">
        <thead>
          <tr>
            <th className="excel-header-gray w-[8%] sm:w-[8%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">POS</span>
              <span className="sm:hidden">#</span>
            </th>
            <th className="excel-header w-[32%] sm:w-[25%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">JUGADOR</span>
              <span className="sm:hidden">JUG</span>
            </th>
            <th className="excel-header w-[12%] sm:w-[12%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">FECHA {lastCompletedDate}</span>
              <span className="sm:hidden">F.{lastCompletedDate}</span>
            </th>
            <th className="excel-header excel-header-total w-[12%] sm:w-[13%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">TOTAL</span>
              <span className="sm:hidden">TOT</span>
            </th>
            <th className="excel-header w-[12%] sm:w-[14%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">ELIMINA 1</span>
              <span className="sm:hidden">E1</span>
            </th>
            <th className="excel-header w-[12%] sm:w-[14%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">ELIMINA 2</span>
              <span className="sm:hidden">E2</span>
            </th>
            <th className="excel-header excel-header-total w-[12%] sm:w-[14%]" style={{color: '#000'}}>
              <span className="hidden sm:inline">FINAL</span>
              <span className="sm:hidden">FIN</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rankingData.rankings.map((player, index) => {
            const pointsLastDate = lastCompletedDate > 0 
              ? player.pointsByDate[lastCompletedDate] || 0
              : 0;
              
            return (
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
                <td className="excel-cell text-left" style={{color: '#000'}}>
                  <span className="hidden sm:inline" style={{color: '#000'}}>{player.playerName}</span>
                  <span className="sm:hidden" style={{color: '#000'}}>{formatPlayerName(player.playerName, true)}</span>
                </td>
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {pointsLastDate}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold score-emphasis" style={{color: '#1a365d'}}>
                  {player.totalPoints}
                </td>
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {player.elimina1 !== undefined ? player.elimina1 : '-'}
                </td>
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {player.elimina2 !== undefined ? player.elimina2 : '-'}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold score-emphasis" style={{color: '#1a365d'}}>
                  {player.finalScore !== undefined ? player.finalScore : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}