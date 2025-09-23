'use client';

import { X, Trophy, Target, Crown } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerTournamentDetails } from '@/hooks/usePlayerTournamentDetails';
import RankingEvolutionChart from './RankingEvolutionChart';
import useSWR from 'swr';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  tournamentId: number;
}

export default function PlayerDetailModal({ 
  isOpen, 
  onClose, 
  playerId, 
  tournamentId 
}: PlayerDetailModalProps) {
  const { details, loading, error } = usePlayerTournamentDetails(
    isOpen ? playerId : '', 
    isOpen ? tournamentId : 0
  );

  // Obtener estadísticas de campeonatos
  const { data: championStats } = useSWR(
    isOpen ? '/api/tournaments/champions-stats' : null,
    (url) => fetch(url).then(res => res.json())
  );

  // Calcular campeonatos del jugador actual
  const playerChampionships = championStats?.data?.all?.find(
    (champion: any) => champion.player?.id === playerId
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-2 sm:p-4 pt-4 sm:pt-8 overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-poker-table border-2 border-poker-red rounded-xl w-full max-w-6xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto scrollbar-custom"
          onClick={(e) => e.stopPropagation()}
        >
          {loading || !details ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-poker-red border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white">Cargando detalles del jugador...</p>
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Header with close button */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-white">Detalles del Jugador</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Player Header Section */}
              <div className="text-center mb-8">
                <div className="w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden card-poker p-2">
                  {details.player.photoUrl ? (
                    <Image
                      src={details.player.photoUrl}
                      alt={details.player.firstName}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-poker-gold">
                      <Trophy className="w-16 h-16" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">
                  {details.player.firstName}
                </h3>
                
                {details.player.aliases.length > 0 && (
                  <p className="text-orange-400 mb-2">
                    ({details.player.aliases.join(', ')})
                  </p>
                )}

                {/* Campeonatos Ganados */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Crown className="w-6 h-6 text-poker-gold" />
                  <span className="text-poker-gold font-bold text-xl">
                    {playerChampionships?.championshipsCount > 0 
                      ? `${playerChampionships.championshipsCount} Campeonato${playerChampionships.championshipsCount > 1 ? 's' : ''}`
                      : 'Sin títulos'
                    }
                  </span>
                </div>
                
                {/* Días sin ganar */}
                <div className="mb-4">
                  {details.player.lastVictoryDate ? (() => {
                    // Calcular días sin ganar
                    const [day, month, year] = details.player.lastVictoryDate.split('/').map(Number);
                    const lastVictoryDate = new Date(year, month - 1, day);
                    const today = new Date();
                    const timeDiff = today.getTime() - lastVictoryDate.getTime();
                    const daysWithoutVictory = Math.floor(timeDiff / (1000 * 3600 * 24));
                    
                    return (
                      <div className="flex flex-col items-center">
                        <span className={`
                          text-3xl font-bold
                          ${daysWithoutVictory > 100 ? 'text-poker-red' : 
                            daysWithoutVictory > 60 ? 'text-poker-orange' : 
                            daysWithoutVictory > 30 ? 'text-poker-gold' : 
                            'text-poker-orange'}
                        `}>
                          {daysWithoutVictory}
                        </span>
                        <span className="text-sm text-gray-400 mt-1">
                          días sin ganar
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          Última victoria: {details.player.lastVictoryDate}
                        </span>
                      </div>
                    );
                  })() : (
                    <div className="text-gray-500 text-sm">
                      Sin victorias registradas
                    </div>
                  )}
                </div>

                <div className="flex justify-center items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-poker-gold" />
                    <span className="text-poker-gold font-bold text-lg score-emphasis">
                      {details.currentStats.totalPoints} pts
                    </span>
                  </div>
                  {details.currentStats.finalScore !== undefined && (
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-orange-400" />
                      <span className="text-orange-400 font-bold text-lg score-emphasis">
                        {details.currentStats.finalScore} final
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-white" />
                    <span className="text-white font-bold text-lg score-emphasis">
                      {details.currentStats.position}° lugar
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Performance Grid */}
              <div className="mb-8">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-poker-red" />
                  Performance por Fecha
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                  {Array.from({ length: 12 }, (_, i) => {
                    const dateNumber = i + 1;
                    const date = details.datePerformance.find(d => d.dateNumber === dateNumber);
                    
                    if (!date || date.status === 'pending' || date.status === 'CREATED') {
                      // Gray card for pending dates
                      return (
                        <div
                          key={dateNumber}
                          className="dashboard-card opacity-50 rounded-lg p-3 text-center"
                          style={{ borderColor: '#4a4a4a' }}
                        >
                          <div className="text-xs text-gray-400 mb-1">
                            F{dateNumber}
                          </div>
                          <div className="text-sm text-gray-500 mb-1">---</div>
                          <div className="text-sm text-gray-500 mb-1">---</div>
                          <div className="text-xs text-gray-500">---</div>
                        </div>
                      );
                    }

                    if (date.status === 'in_progress') {
                      // Orange card for in-progress dates
                      return (
                        <div
                          key={dateNumber}
                          className="dashboard-card rounded-lg p-3 text-center"
                          style={{ borderColor: '#f59e0b' }}
                        >
                          <div className="text-xs text-poker-muted mb-1">
                            F{dateNumber}
                          </div>
                          <div className="text-sm text-orange-400 mb-1">EN VIVO</div>
                          <div className="text-poker-gold font-bold text-sm mb-1 score-emphasis">
                            {date.points} pts
                          </div>
                          <div className="text-xs text-orange-400">JUGANDO</div>
                        </div>
                      );
                    }

                    // Check if this date is part of ELIMINA 2 (worst dates)
                    const isElimina2Date = date.points === details.currentStats.elimina1 || 
                                          date.points === details.currentStats.elimina2;
                    
                    // Completed date
                    return (
                      <div
                        key={dateNumber}
                        className="dashboard-card rounded-lg p-3 text-center"
                        style={{ borderColor: isElimina2Date ? '#6b7280' : 'var(--poker-red)' }}
                      >
                        <div className="text-xs text-poker-muted mb-1">
                          F{dateNumber}
                        </div>
                        <div className="text-sm font-bold mb-1">
                          {date.isAbsent ? (
                            <span className="text-gray-400">AUSENTE</span>
                          ) : date.eliminationPosition ? (
                            <span className="text-white">{date.eliminationPosition}°</span>
                          ) : (
                            <span className="text-white">GANÓ</span>
                          )}
                        </div>
                        <div className="text-poker-gold font-bold text-sm mb-1 score-emphasis">
                          {date.points} pts
                        </div>
                        <div className={`text-xs ${date.eliminatedBy?.isGuest ? 'text-pink-500' : 'text-orange-400'}`}>
                          {date.isAbsent ? (
                            <span className="text-gray-400">NO PARTICIPÓ</span>
                          ) : date.eliminationPosition ? (
                            date.eliminatedBy?.isGuest ? 'Invitado' : date.eliminatedBy?.alias || date.eliminatedBy?.name
                          ) : (
                            'CAMPEÓN'
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* Ranking Evolution Chart */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  📈 Evolución en el Ranking
                </h4>
                <RankingEvolutionChart 
                  data={details.rankingEvolution}
                  playerName={details.player.firstName}
                />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}