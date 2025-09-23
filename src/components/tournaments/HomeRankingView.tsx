'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import Image from 'next/image';
import PlayerDetailModal from './PlayerDetailModal';
import { useTournamentRanking } from '@/hooks/useTournamentRanking';

interface HomeRankingViewProps {
  tournamentId: number;
}

export default function HomeRankingView({ tournamentId }: HomeRankingViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use SWR hook for tournament ranking data
  const { 
    ranking: rankingData, 
    isLoading: loading, 
    isError,
    errorMessage,
    refresh 
  } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true
  });

  const openPlayerModal = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setIsModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsModalOpen(false);
    setSelectedPlayerId(null);
  };

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

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg mb-4">Error al cargar el ranking</p>
        <p className="text-poker-muted text-sm mb-4">{errorMessage}</p>
        <button
          onClick={refresh}
          className="bg-poker-red hover:bg-poker-red/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Reintentar
        </button>
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
    <div className="w-full overflow-visible">
      {/* Título compacto */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Torneo #{rankingData.tournament.number}</h1>
        <div className="text-xs text-poker-muted">
          {rankings.length} jugadores • {rankingData.tournament.completedDates}/{rankingData.tournament.totalDates} fechas
        </div>
      </div>

      {/* Podio - Top 3 */}
      <div className="mb-4">
        <div className="flex justify-center items-center gap-2 sm:gap-3">
          {topThree.map((player) => {
            if (!player) return null;
            
            const isFirst = player.position === 1;
            const isSecond = player.position === 2;
            
            return (
              <div
                key={player.playerId}
                className="relative flex flex-col items-center"
              >
                {/* Card del podio */}
                <div
                  className="relative dashboard-card rounded-lg p-3 w-24 sm:w-28 h-32 sm:h-36 cursor-pointer"
                  onClick={() => openPlayerModal(player.playerId)}
                >
                  {/* Círculo de posición mejorado */}
                  <div className={`
                    absolute -top-2 -left-2 w-9 h-9 rounded-full 
                    flex items-center justify-center font-bold text-sm z-50 shadow-lg
                    ${isFirst 
                      ? 'position-1st' 
                      : isSecond 
                      ? 'position-2nd' 
                      : 'position-3rd'
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
                        ? 'bg-gradient-to-br from-yellow-900/40 via-yellow-700/30 to-yellow-500/20' 
                        : isSecond 
                        ? 'bg-gradient-to-br from-gray-600/40 via-gray-500/30 to-gray-400/20' 
                        : 'bg-gradient-to-br from-orange-900/40 via-orange-700/30 to-orange-500/20'
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
                  <div className="flex flex-col items-end">
                    <span className="text-orange-400 font-bold score-emphasis text-sm">{player.finalScore || player.totalPoints}</span>
                    <span className="text-poker-gold font-semibold text-xs">{player.totalPoints}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Posiciones 4+ en cards - Grid 2 columnas */}
      {middle.length > 0 && (
        <div className="mb-4 overflow-visible">
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto px-2 overflow-visible">
            {middle.map((player) => {
              const firstName = player.playerName.split(' ')[0];
              
              return (
                <div
                  key={player.playerId}
                  className="relative dashboard-card rounded-lg p-3 cursor-pointer overflow-visible"
                  onClick={() => openPlayerModal(player.playerId)}
                >
                  {/* Círculo de posición mejorado */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs border-2 border-gray-600 shadow-lg z-50">
                    {player.position}
                  </div>
                  
                  <div className="flex justify-between items-center gap-3 pt-2 h-full">
                    <div className="flex items-center gap-3">
                      {player.playerPhoto ? (
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-black/20">
                          <Image
                            src={player.playerPhoto}
                            alt={player.playerName}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-white/10 flex items-center justify-center">
                          <User className="w-7 h-7 text-white/50" />
                        </div>
                      )}
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
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-orange-400 font-bold score-emphasis text-sm">{player.finalScore || player.totalPoints}</span>
                      <span className="text-poker-gold font-semibold text-xs">{player.totalPoints}</span>
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
                    className="relative dashboard-card card-last-position rounded-lg p-3 w-24 sm:w-28 h-32 sm:h-36 cursor-pointer"
                    onClick={() => openPlayerModal(player.playerId)}
                  >
                    {/* Círculo de posición rosa mejorado */}
                    <div className="absolute -top-2 -left-2 w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-sm border-2 border-pink-400 z-50 shadow-lg">
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
