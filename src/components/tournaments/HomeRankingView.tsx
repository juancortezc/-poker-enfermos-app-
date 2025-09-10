'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Star, Award, User } from 'lucide-react';
import type { TournamentRankingData } from '@/lib/ranking-utils';
import Image from 'next/image';
import PlayerDetailModal from './PlayerDetailModal';

interface HomeRankingViewProps {
  tournamentId: number;
}

export default function HomeRankingView({ tournamentId }: HomeRankingViewProps) {
  const [rankingData, setRankingData] = useState<TournamentRankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openPlayerModal = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setIsModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsModalOpen(false);
    setSelectedPlayerId(null);
  };

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
        console.error('Error fetching ranking:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRanking();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="animate-pulse px-4">
        <div className="h-40 bg-white/10 rounded-lg mb-2"></div>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!rankingData || rankingData.rankings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-poker-muted text-lg">No hay datos de ranking disponibles</p>
      </div>
    );
  }

  const { rankings } = rankingData;
  
  // Separar los jugadores por posición
  const topThree = rankings.slice(0, 3);
  const middle = rankings.slice(3, -2);
  const lastTwo = rankings.slice(-2);

  return (
    <div className="w-full">
      {/* Título compacto */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Ranking Torneo #{rankingData.tournament.number}</h1>
      </div>

      {/* Podio - Top 3 */}
      <div className="mb-4">
        <div className="flex justify-center items-center gap-2 sm:gap-3">
          {topThree.map((player, index) => {
            if (!player) return null;
            
            const isFirst = player.position === 1;
            const isSecond = player.position === 2;
            const isThird = player.position === 3;
            
            return (
              <div
                key={player.playerId}
                className="relative flex flex-col items-center"
              >
                {/* Card del podio */}
                <div
                  className="relative bg-gradient-to-br from-poker-card to-gray-800 rounded-lg p-3 shadow-2xl ring-1 ring-white/10 transform transition-all duration-300 hover:scale-105 hover:shadow-3xl w-24 sm:w-28 h-32 sm:h-36 cursor-pointer"
                  onClick={() => openPlayerModal(player.playerId)}
                >
                  {/* Círculo de posición */}
                  <div className={`
                    absolute -top-2 -left-2 w-8 h-8 rounded-full 
                    flex items-center justify-center font-bold text-sm
                    border-2 z-10
                    ${isFirst 
                      ? 'bg-yellow-400 text-black border-yellow-500' 
                      : isSecond 
                      ? 'bg-gray-300 text-black border-gray-400' 
                      : 'bg-orange-400 text-black border-orange-500'
                    }
                  `}>
                    {player.position}
                  </div>

                  {/* Foto como fondo del card */}
                  {player.playerPhoto ? (
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                      <Image
                        src={player.playerPhoto}
                        alt={player.playerName}
                        width={144}
                        height={176}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>
                  ) : (
                    <div className={`
                      absolute inset-0 rounded-lg
                      ${isFirst 
                        ? 'bg-gradient-to-br from-yellow-900/50 to-yellow-600/30' 
                        : isSecond 
                        ? 'bg-gradient-to-br from-gray-700/50 to-gray-500/30' 
                        : 'bg-gradient-to-br from-orange-900/50 to-orange-600/30'
                      }
                    `} />
                  )}

                  {/* Contenido sobre la foto */}
                  <div className="relative flex flex-col items-center justify-end h-full pb-2">
                    {/* Si no hay foto, mostrar icono */}
                    {!player.playerPhoto && (
                      <div className="mb-auto mt-4">
                        <User className="w-12 sm:w-16 h-12 sm:h-16 text-white/50" />
                      </div>
                    )}

                    {/* Nombre en la base */}
                    <h3 className="text-white font-bold text-xs sm:text-sm text-center drop-shadow-lg">
                      {player.playerName.split(' ')[0]}
                    </h3>
                  </div>
                </div>
                
                {/* Puntos bajo la foto, alineados a la derecha */}
                <div className="text-right mt-1">
                  <div className="flex flex-col items-end text-sm">
                    <span className="text-orange-400 font-bold">{player.finalScore || player.totalPoints}</span>
                    <span className="text-poker-gold font-bold">{player.totalPoints}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Posiciones 4+ en cards */}
      {middle.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2 px-2">
            {middle.map((player, index) => {
              const firstName = player.playerName.split(' ')[0];
              
              return (
                <div
                  key={player.playerId}
                  className="relative bg-poker-card border-2 border-poker-red rounded-lg p-2 shadow-lg ring-1 ring-poker-red/20 hover:shadow-xl transition-all duration-200 cursor-pointer"
                  onClick={() => openPlayerModal(player.playerId)}
                >
                  {/* Círculo de posición */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs border border-white/20 shadow-md">
                    {player.position}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 h-full">
                    <div>
                      <h4 className="font-semibold text-white text-xs">
                        {firstName}
                      </h4>
                      {player.playerAlias && (
                        <p className="text-orange-400 text-xs">
                          ({player.playerAlias})
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end text-sm">
                      <span className="text-orange-400 font-bold">{player.finalScore || player.totalPoints}</span>
                      <span className="text-poker-gold font-bold">{player.totalPoints}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Últimas 2 posiciones - Mismo diseño que Top 3 con círculo rosa */}
      {lastTwo.length > 0 && (
        <div className="mt-3">
          <div className="flex justify-center gap-2 sm:gap-3">
            {lastTwo.map((player) => {
              const firstName = player.playerName.split(' ')[0];
              
              return (
                <div
                  key={player.playerId}
                  className="relative flex flex-col items-center"
                >
                  <div 
                    className="relative bg-gradient-to-br from-poker-card to-gray-800 rounded-lg p-3 shadow-xl transform transition-all duration-300 hover:scale-105 w-24 sm:w-28 h-32 sm:h-36 cursor-pointer"
                    onClick={() => openPlayerModal(player.playerId)}
                  >
                    {/* Círculo de posición rosa */}
                    <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-sm border-2 border-pink-400 z-10">
                      {player.position}
                    </div>

                    {/* Foto como fondo del card */}
                    {player.playerPhoto ? (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <Image
                          src={player.playerPhoto}
                          alt={player.playerName}
                          width={144}
                          height={176}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-pink-900/50 to-pink-600/30" />
                    )}

                    {/* Contenido sobre la foto */}
                    <div className="relative flex flex-col items-center justify-end h-full pb-2">
                      {/* Si no hay foto, mostrar icono */}
                      {!player.playerPhoto && (
                        <div className="mb-auto mt-4">
                          <User className="w-12 sm:w-16 h-12 sm:h-16 text-white/50" />
                        </div>
                      )}

                      {/* Nombre en la base */}
                      <h3 className="text-white font-bold text-xs sm:text-sm text-center drop-shadow-lg">
                        {firstName}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Puntos bajo la foto, alineados a la derecha */}
                  <div className="text-right mt-1">
                    <div className="flex flex-col items-end text-sm">
                      <span className="text-orange-400 font-bold">{player.finalScore || player.totalPoints}</span>
                      <span className="text-poker-gold font-bold">{player.totalPoints}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-3 text-center text-poker-muted text-xs">
        <p>{rankings.length} jugadores • {rankingData.tournament.completedDates}/{rankingData.tournament.totalDates} fechas</p>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayerId && (
        <PlayerDetailModal
          isOpen={isModalOpen}
          onClose={closePlayerModal}
          playerId={selectedPlayerId}
          tournamentId={tournamentId}
        />
      )}
    </div>
  );
}