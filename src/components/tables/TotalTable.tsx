'use client';

import { useState, useEffect } from 'react';
import { useTournamentRanking } from '@/hooks/useTournamentRanking';

interface TotalTableProps {
  tournamentId: number;
  userPin?: string | null;
  currentUserId?: string | null;
}

const RED = '#E53935';
const GOLD = '#E8C158';
const SILVER = '#B9B9C4';
const BRONZE = '#C98A4E';
const NEUTRAL_HEADER = '#2A292B';
const PURPLE_INFO = '#7c3aed';
const GRID = '#000';

function medalBadgeStyle(position: number) {
  if (position === 1) return { background: GOLD, color: '#1A1512' };
  if (position === 2) return { background: SILVER, color: '#1A1512' };
  if (position === 3) return { background: BRONZE, color: '#1A1512' };
  return { background: '#EFEFEF', color: '#000' };
}

export default function TotalTable({ tournamentId, currentUserId }: TotalTableProps) {
  const [completedDates, setCompletedDates] = useState<number[]>([]);

  const {
    ranking: rankingData,
    isLoading: loading,
    isError,
    errorMessage
  } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000
  });

  useEffect(() => {
    if (rankingData && rankingData.rankings.length > 0) {
      const dateNumbers = Object.keys(rankingData.rankings[0].pointsByDate || {})
        .map(Number)
        .filter(dateNumber => dateNumber > 0)
        .sort((a, b) => a - b);
      setCompletedDates(dateNumbers);
    }
  }, [rankingData]);

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
        <div style={{ color: '#7A6E62' }}>Cargando datos...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: '#E53935' }}>Error: {errorMessage}</div>
      </div>
    );
  }

  if (!rankingData || completedDates.length === 0) {
    return (
      <div className="text-center py-8">
        <p style={{ color: '#7A6E62' }}>No hay fechas completadas disponibles</p>
      </div>
    );
  }

  const has3 = (rankingData.tournament.datesToEliminate ?? 2) >= 3;
  const nameFormat = 'medium';
  const lastDate = completedDates[completedDates.length - 1];

  const thStyle: React.CSSProperties = {
    background: NEUTRAL_HEADER,
    color: '#F5EFE6',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.03em',
    textAlign: 'center',
    padding: '8px 5px',
    border: `1px solid ${GRID}`,
    whiteSpace: 'nowrap'
  };

  const thTotalStyle: React.CSSProperties = {
    ...thStyle,
    background: RED,
    color: '#fff'
  };

  const tdStyle: React.CSSProperties = {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
    padding: '7px 5px',
    border: `1px solid ${GRID}`,
    background: '#fff'
  };

  const elimColor = (active: boolean) => (active ? { color: '#000' } : { color: PURPLE_INFO });

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${GRID}` }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }}>#</th>
              <th style={{ ...thStyle, textAlign: 'left', width: 110 }}>JUGADOR</th>
              {lastDate !== undefined && <th style={{ ...thStyle, width: 44 }}>F{lastDate}</th>}
              <th style={{ ...thStyle, width: 50 }}>FINAL</th>
              <th style={{ ...thStyle, width: 40 }}>E1</th>
              <th style={{ ...thStyle, width: 40 }}>E2</th>
              {has3 && <th style={{ ...thStyle, width: 40 }}>E3</th>}
              <th style={{ ...thTotalStyle, width: 50 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rankingData.rankings.map((player, index) => {
              const isCurrentUser = currentUserId && player.playerId === currentUserId;
              const isMalazo = player.position > rankingData.rankings.length - 2;
              const rowBg = isCurrentUser ? '#FEF3C7' : isMalazo ? '#FCE4EC' : index % 2 === 1 ? '#F7F7F7' : '#fff';
              const badge = medalBadgeStyle(player.position);
              return (
                <tr key={player.playerId}>
                  <td style={{ ...tdStyle, background: rowBg }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 800, fontSize: 11, ...badge }}>
                      {player.position}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, background: rowBg, textAlign: 'left', fontWeight: 600 }}>
                    {formatPlayerName(player.playerName, nameFormat)}
                    {isCurrentUser && <span style={{ color: '#B45309', marginLeft: 4, fontSize: 10 }}>◀ TÚ</span>}
                  </td>
                  {lastDate !== undefined && (
                    <td style={{ ...tdStyle, background: rowBg }}>{player.pointsByDate[lastDate] || 0}</td>
                  )}
                  <td style={{ ...tdStyle, background: rowBg, fontWeight: 700, color: '#8A6A1E' }}>
                    {player.finalScore !== undefined ? player.finalScore : '-'}
                  </td>
                  <td style={{ ...tdStyle, background: rowBg, ...elimColor(player.eliminasActive), fontWeight: 500 }}>
                    {player.elimina1 !== undefined ? player.elimina1 : '-'}
                  </td>
                  <td style={{ ...tdStyle, background: rowBg, ...elimColor(player.eliminasActive), fontWeight: 500 }}>
                    {player.elimina2 !== undefined ? player.elimina2 : '-'}
                  </td>
                  {has3 && (
                    <td style={{ ...tdStyle, background: rowBg, ...elimColor(player.eliminasActive), fontWeight: 500 }}>
                      {player.elimina3 !== undefined ? player.elimina3 : '-'}
                    </td>
                  )}
                  <td style={{ ...tdStyle, background: rowBg, fontWeight: 900, color: RED, fontSize: 13 }}>
                    {player.totalPoints}
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
