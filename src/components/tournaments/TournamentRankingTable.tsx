'use client';

import { useState, useEffect } from 'react';
import { TrophyIcon } from 'lucide-react';
import Link from 'next/link';
import type { TournamentRankingData } from '@/lib/ranking-utils';

interface TournamentRankingTableProps {
  tournamentId: number;
  compact?: boolean; // Para mostrar en dashboard (solo top 5)
}

export default function TournamentRankingTable({ 
  tournamentId, 
  compact = false 
}: TournamentRankingTableProps) {
  const [rankingData, setRankingData] = useState<TournamentRankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoading(true);
        const response = await fetch(`/api/tournaments/${tournamentId}/ranking`);
        
        if (!response.ok) {
          throw new Error('Error al cargar el ranking');
        }

        const data = await response.json();
        setRankingData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    fetchRanking();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-white/10 rounded mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (error || !rankingData) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-muted">{error || 'No se pudo cargar el ranking'}</p>
      </div>
    );
  }

  const { tournament, rankings } = rankingData;
  const displayRankings = compact ? rankings.slice(0, 5) : rankings;

  // Obtener fechas completadas para mostrar columnas
  const completedDates = Array.from({ length: tournament.completedDates }, (_, i) => i + 1)
    .reverse(); // Más recientes primero

  // Colores para posiciones
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-400'; // Oro
      case 2: return 'text-gray-300';   // Plata
      case 3: return 'text-orange-400'; // Bronce
      default: return 'text-white';
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1: return 'bg-yellow-400/10 border-yellow-400/20';
      case 2: return 'bg-gray-300/10 border-gray-300/20';
      case 3: return 'bg-orange-400/10 border-orange-400/20';
      default: return 'bg-transparent border-white/5';
    }
  };

  return (
    <div className="bg-poker-card border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrophyIcon className="w-5 h-5 mr-2 text-poker-gold" />
            <h3 className="font-bold text-white">
              {compact ? 'Top Ranking' : `Ranking ${tournament.name}`}
            </h3>
          </div>
          <div className="text-xs text-poker-muted">
            {tournament.completedDates}/{tournament.totalDates} fechas
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="sticky left-0 bg-white/5 text-left py-3 px-4 text-poker-muted font-medium border-r border-white/10">
                POS
              </th>
              <th className="sticky left-12 bg-white/5 text-left py-3 px-4 text-poker-muted font-medium border-r border-white/10 min-w-[120px]">
                JUGADOR
              </th>
              <th className="text-center py-3 px-3 text-poker-gold font-bold border-r border-white/10 min-w-[80px]">
                TOTAL
              </th>
              {completedDates.map(dateNum => (
                <th key={dateNum} className="text-center py-3 px-2 text-poker-muted font-medium min-w-[50px]">
                  F{dateNum}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRankings.map((player, index) => (
              <tr 
                key={player.playerId} 
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${getPositionBg(player.position)}`}
              >
                <td className={`sticky left-0 bg-poker-card py-3 px-4 font-bold border-r border-white/10 ${getPositionColor(player.position)}`}>
                  {player.position}
                </td>
                <td className="sticky left-12 bg-poker-card py-3 px-4 text-white font-medium border-r border-white/10 truncate">
                  {player.playerName}
                </td>
                <td className="text-center py-3 px-3 text-poker-gold font-bold text-lg border-r border-white/10">
                  {player.totalPoints}
                </td>
                {completedDates.map(dateNum => (
                  <td key={dateNum} className="text-center py-3 px-2 text-poker-text">
                    {player.pointsByDate[dateNum] !== undefined 
                      ? player.pointsByDate[dateNum] 
                      : '-'
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer para compact view */}
      {compact && rankings.length > 5 && (
        <div className="p-3 border-t border-white/10 text-center">
          <Link 
            href="/ranking"
            className="text-poker-accent hover:text-poker-accent-hover text-sm font-medium transition-colors"
          >
            Ver ranking completo →
          </Link>
        </div>
      )}

      {/* Footer info */}
      <div className="p-3 border-t border-white/10 bg-white/5">
        <div className="flex justify-between items-center text-xs text-poker-muted">
          <span>{displayRankings.length} jugadores registrados</span>
          <span>
            Actualizado: {new Date(rankingData.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}