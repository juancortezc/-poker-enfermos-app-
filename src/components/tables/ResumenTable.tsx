'use client';

import { useTournamentRanking } from '@/hooks/useTournamentRanking';

interface ResumenTableProps {
  tournamentId: number;
  userPin?: string | null;
  currentUserId?: string | null;
}

export default function ResumenTable({ tournamentId, currentUserId }: ResumenTableProps) {

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


  const datesToEliminate = rankingData.tournament.datesToEliminate ?? 2;
  const has3 = datesToEliminate >= 3;

  // Widths adapt to number of elimina columns
  const colWidths = has3
    ? { pos: '7%', jug: '27%', jugSm: '22%', fecha: '10%', tot: '10%', elim: '10%', fin: '11%' }
    : { pos: '8%', jug: '32%', jugSm: '25%', fecha: '12%', tot: '12%', elim: '12%', fin: '12%' };

  // Color for elimina values: purple when not yet active, normal when active
  const elimColors = (active: boolean) => active
    ? { color: '#000' }
    : { color: '#7c3aed' }; // morado = informativo, no afecta ranking

  return (
    <div className="w-full">
      <div>
        <table className="excel-table w-full table-fixed">
        <thead>
          <tr>
            <th className="excel-header-gray" style={{color: '#000', width: colWidths.pos}}>
              <span className="hidden sm:inline">POS</span>
              <span className="sm:hidden">#</span>
            </th>
            <th className="excel-header" style={{color: '#000', width: colWidths.jug}}>
              <span className="hidden sm:inline">JUGADOR</span>
              <span className="sm:hidden">JUG</span>
            </th>
            <th className="excel-header" style={{color: '#000', width: colWidths.fecha}}>
              <span className="hidden sm:inline">FECHA {lastCompletedDate}</span>
              <span className="sm:hidden">F.{lastCompletedDate}</span>
            </th>
            <th className="excel-header excel-header-total" style={{color: '#000', width: colWidths.tot}}>
              <span className="hidden sm:inline">TOTAL</span>
              <span className="sm:hidden">TOT</span>
            </th>
            <th className="excel-header" style={{color: '#000', width: colWidths.elim}}>
              <span className="hidden sm:inline">ELIMINA 1</span>
              <span className="sm:hidden">E1</span>
            </th>
            <th className="excel-header" style={{color: '#000', width: colWidths.elim}}>
              <span className="hidden sm:inline">ELIMINA 2</span>
              <span className="sm:hidden">E2</span>
            </th>
            {has3 && (
              <th className="excel-header" style={{color: '#000', width: colWidths.elim}}>
                <span className="hidden sm:inline">ELIMINA 3</span>
                <span className="sm:hidden">E3</span>
              </th>
            )}
            <th className="excel-header excel-header-total" style={{color: '#000', width: colWidths.fin}}>
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
            const active = player.eliminasActive;

            return (
              <tr key={player.playerId} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="excel-cell excel-cell-gray text-center font-medium" style={{color: '#000'}}>
                  <span className="text-sm font-semibold">{player.position}</span>
                </td>
                <td className="excel-cell text-left" style={{color: '#000'}}>
                  <span className="hidden sm:inline">{player.playerName}</span>
                  <span className="sm:hidden">{formatPlayerName(player.playerName, true)}</span>
                </td>
                <td className="excel-cell text-center" style={{color: '#000'}}>
                  {pointsLastDate}
                </td>
                <td className="excel-cell excel-cell-total text-center font-bold score-emphasis" style={{color: '#1a365d'}}>
                  {player.totalPoints}
                </td>
                <td className="excel-cell text-center font-medium" style={elimColors(active)}>
                  {player.elimina1 !== undefined ? player.elimina1 : '-'}
                </td>
                <td className="excel-cell text-center font-medium" style={elimColors(active)}>
                  {player.elimina2 !== undefined ? player.elimina2 : '-'}
                </td>
                {has3 && (
                  <td className="excel-cell text-center font-medium" style={elimColors(active)}>
                    {player.elimina3 !== undefined ? player.elimina3 : '-'}
                  </td>
                )}
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
