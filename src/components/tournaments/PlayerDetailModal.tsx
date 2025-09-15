'use client';

import { X, Trophy, Target, Crown } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerTournamentDetails } from '@/hooks/usePlayerTournamentDetails';
import RankingEvolutionChart from './RankingEvolutionChart';

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="dashboard-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
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
            <div className="p-6">
              {/* Header with close button */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-white">Detalles del Jugador</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-smooth p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Player Header Section */}
              <div className="text-center mb-8">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden dashboard-card p-2">
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
                  <p className="text-orange-400 mb-4">
                    ({details.player.aliases.join(', ')})
                  </p>
                )}

                <div className="flex justify-center items-center gap-4">
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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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

              {/* Last Victory Card */}
              {details.player.lastVictoryDate && (
                <div className="mb-8">
                  <div className="dashboard-card rounded-lg p-4" style={{ background: 'linear-gradient(135deg, var(--poker-card) 0%, rgba(225, 6, 0, 0.2) 100%)' }}>
                    <div className="flex items-center gap-3">
                      <Crown className="w-6 h-6 text-poker-gold" />
                      <div>
                        <h5 className="text-white font-bold">Última Victoria</h5>
                        <p className="text-poker-muted text-sm">
                          {new Date(details.player.lastVictoryDate).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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