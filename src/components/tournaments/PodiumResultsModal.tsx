'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trophy, Medal, Award, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  isActive: boolean;
  aliases: string[];
}

interface PodiumStatistics {
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  sietePositions: number;
  dosPositions: number;
  totalPodiums: number;
  totalAppearances: number;
}

interface TournamentDetail {
  tournamentNumber: number;
  position: 'champion' | 'runnerUp' | 'thirdPlace' | 'siete' | 'dos';
  positionText: string;
}

interface PodiumDetailsData {
  player: Player;
  statistics: PodiumStatistics;
  tournamentDetails: TournamentDetail[];
  summary: {
    bestPosition: string;
    totalTournaments: number;
    podiumRate: number;
  };
}

interface PodiumResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string | null;
}

export default function PodiumResultsModal({ isOpen, onClose, playerId }: PodiumResultsModalProps) {
  const [data, setData] = useState<PodiumDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPodiumDetails = useCallback(async () => {
    if (!playerId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/players/${playerId}/podium-details`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Error al cargar detalles');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPodiumDetails();
    }
  }, [isOpen, playerId, fetchPodiumDetails]);

  const getPlayerName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`;
  };

  const getPlayerAlias = (player: Player) => {
    return player.aliases && player.aliases.length > 0 ? player.aliases[0] : '';
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'champion': return 'text-yellow-500 bg-yellow-500/20';
      case 'runnerUp': return 'text-gray-400 bg-gray-400/20';
      case 'thirdPlace': return 'text-orange-500 bg-orange-500/20';
      case 'siete': return 'text-purple-400 bg-purple-400/20';
      case 'dos': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'champion': return <Trophy className="w-4 h-4" />;
      case 'runnerUp': return <Medal className="w-4 h-4" />;
      case 'thirdPlace': return <Award className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  if (!isOpen || !playerId) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-poker-dark border border-gray-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <div className="flex items-center space-x-4">
                {data?.player.photoUrl ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    <Image
                      src={data.player.photoUrl}
                      alt={getPlayerName(data.player)}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-poker-card flex items-center justify-center">
                    <User className="w-8 h-8 text-poker-muted" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {data ? getPlayerName(data.player) : 'Cargando...'}
                  </h2>
                  {data && getPlayerAlias(data.player) && (
                    <p className="text-orange-400 text-lg">
                      ({getPlayerAlias(data.player)})
                    </p>
                  )}
                  <p className="text-poker-muted text-sm">Historial de Posiciones</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-red mx-auto"></div>
                  <p className="text-poker-muted mt-4">Cargando estadísticas...</p>
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <p className="text-red-400 text-lg mb-4">Error: {error}</p>
                  <button
                    onClick={fetchPodiumDetails}
                    className="bg-poker-red hover:bg-poker-red/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {data && (
                <div className="space-y-8">
                  {/* Statistics Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="dashboard-card p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                      </div>
                      <div className="text-2xl font-bold text-yellow-500">
                        {data.statistics.firstPlaces}
                      </div>
                      <div className="text-sm text-poker-muted">Campeonatos</div>
                    </div>

                    <div className="dashboard-card p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Medal className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-400">
                        {data.statistics.secondPlaces}
                      </div>
                      <div className="text-sm text-poker-muted">Subcampeonatos</div>
                    </div>

                    <div className="dashboard-card p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Award className="w-8 h-8 text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold text-orange-500">
                        {data.statistics.thirdPlaces}
                      </div>
                      <div className="text-sm text-poker-muted">Terceros</div>
                    </div>

                    <div className="dashboard-card p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {data.statistics.sietePositions}
                      </div>
                      <div className="text-sm text-poker-muted">Sietes</div>
                    </div>

                    <div className="dashboard-card p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {data.statistics.dosPositions}
                      </div>
                      <div className="text-sm text-poker-muted">Dos</div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="dashboard-card p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Mejor Posición</h3>
                      <p className="text-2xl font-bold text-poker-red">{data.summary.bestPosition}</p>
                    </div>

                    <div className="dashboard-card p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Total Podios</h3>
                      <p className="text-2xl font-bold text-orange-400">{data.statistics.totalPodiums}</p>
                    </div>

                    <div className="dashboard-card p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Apariciones</h3>
                      <p className="text-2xl font-bold text-blue-400">{data.summary.totalTournaments}</p>
                    </div>
                  </div>

                  {/* Tournament History */}
                  {data.tournamentDetails.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Historial por Torneo</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                        {data.tournamentDetails.map((detail) => (
                          <div
                            key={`${detail.tournamentNumber}-${detail.position}`}
                            className={`dashboard-card p-3 flex items-center justify-between ${getPositionColor(detail.position)}`}
                          >
                            <div className="flex items-center space-x-3">
                              {getPositionIcon(detail.position)}
                              <div>
                                <p className="font-semibold">Torneo {detail.tournamentNumber}</p>
                                <p className="text-sm opacity-75">{detail.positionText}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.tournamentDetails.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-poker-muted text-lg">
                        Este jugador no ha participado en posiciones de podio aún.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
