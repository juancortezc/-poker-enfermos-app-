'use client';

import { X, Trophy, Target, Crown } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerTournamentDetails } from '@/hooks/usePlayerTournamentDetails';
import RankingEvolutionChart from './RankingEvolutionChart';
import useSWR from 'swr';

interface ChampionPlayer {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  isActive: boolean;
  aliases: string[];
}

interface ChampionData {
  player: ChampionPlayer | null;
  championshipsCount: number;
  tournamentNumbers: number[];
}

interface ChampionStatsResponse {
  success: boolean;
  data?: {
    all: ChampionData[];
    top3: ChampionData[];
    others: ChampionData[];
    totalChampions: number;
    totalChampionships: number;
  };
  error?: string;
}

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
  const { data: championStats } = useSWR<ChampionStatsResponse>(
    isOpen ? '/api/tournaments/champions-stats' : null,
    (url: string) => fetch(url).then(res => res.json() as Promise<ChampionStatsResponse>)
  );

  // Calcular campeonatos del jugador actual
  const playerChampionships = championStats?.data?.all?.find(
    (champion) => champion.player?.id === playerId
  );

  const totalCompletedDates = details?.datePerformance
    ? details.datePerformance.filter(date => date && date.status === 'completed').length
    : 0;
  const totalDates = details?.datePerformance?.length ?? 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/75 backdrop-blur-sm p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/12 bg-gradient-to-br from-[#1c1e32] via-[#181a2c] to-[#10111b] shadow-[0_40px_120px_rgba(8,9,15,0.6)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />

          {loading || !details ? (
            <div className="relative z-10 p-10 text-center">
              <div className="mb-5 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                </div>
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Cargando detalles del jugador...
              </p>
              {error && (
                <p className="mt-3 text-sm text-rose-300">{error}</p>
              )}
            </div>
          ) : (
            <div className="relative z-10 space-y-8 p-5 sm:p-8 lg:p-10">
              {/* Header */}
              <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-3xl border border-white/12 bg-white/5 p-2 shadow-[0_24px_60px_rgba(8,9,15,0.45)] md:mx-0">
                    <div className="relative h-full w-full overflow-hidden rounded-2xl">
                      {details.player.photoUrl ? (
                        <Image
                          src={details.player.photoUrl}
                          alt={details.player.firstName}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-900/40 via-yellow-700/30 to-yellow-400/20 text-4xl text-white/60">
                          🏆
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    </div>
                  </div>

                  <div className="space-y-4 text-center md:text-left">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">Jugador destacado</p>
                      <h2 className="text-3xl font-semibold tracking-tight text-white">
                        {details.player.firstName} {details.player.lastName}
                      </h2>
                      {details.player.aliases.length > 0 && (
                        <p className="text-sm text-orange-400">
                          ({details.player.aliases.join(', ')})
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                        <Crown className="h-4 w-4 text-poker-gold" />
                        {playerChampionships?.championshipsCount ? (
                          <span>
                            {playerChampionships.championshipsCount} Campeonato{playerChampionships.championshipsCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span>Sin títulos</span>
                        )}
                      </div>

                      {details.player.lastVictoryDate ? (() => {
                        const [day, month, year] = details.player.lastVictoryDate.split('/').map(Number)
                        const victoryDate = new Date(year, month - 1, day)
                        const today = new Date()
                        const daysWithoutVictory = Math.floor(
                          (today.getTime() - victoryDate.getTime()) / (1000 * 3600 * 24)
                        )

                        return (
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                            <Target className="h-4 w-4 text-white" />
                            <span>{daysWithoutVictory} días sin ganar</span>
                          </div>
                        )
                      })() : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                          <Target className="h-4 w-4 text-white" />
                          <span>Sin victorias registradas</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/70 transition-all hover:border-white/35 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              {/* Highlights */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Puntos acumulados',
                    value: `${details.currentStats.totalPoints}`,
                    accent: 'text-poker-gold'
                  },
                  details.currentStats.finalScore !== undefined
                    ? {
                        label: 'Puntaje final proyectado',
                        value: `${details.currentStats.finalScore}`,
                        accent: 'text-orange-300'
                      }
                    : null,
                  {
                    label: 'Posición actual',
                    value: `${details.currentStats.position}°`,
                    accent: 'text-white'
                  },
                  {
                    label: 'Mejor resultado',
                    value: details.bestResult,
                    accent: 'text-emerald-300'
                  },
                  {
                    label: 'Fechas jugadas',
                    value: `${totalCompletedDates}`,
                    suffix: totalDates ? `/${totalDates}` : undefined,
                    accent: 'text-white'
                  }
                ]
                  .filter(Boolean)
                  .map((card, index) => {
                    const { label, value, accent = 'text-white', suffix } = card as {
                      label: string
                      value: string
                      accent?: string
                      suffix?: string
                    }

                    return (
                      <div
                        key={`${label}-${index}`}
                        className="rounded-2xl border border-white/12 bg-white/5 p-4 text-center"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                          {label}
                        </p>
                        <p className={`mt-2 text-3xl font-bold ${accent}`}>
                          {value}
                          {suffix && <span className="ml-1 text-sm text-white/45">{suffix}</span>}
                        </p>
                      </div>
                    )
                  })}
              </section>

              {/* Date Performance Grid */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-2xl border border-white/15 bg-white/5 text-center text-lg leading-9 text-poker-red">F</div>
                  <h3 className="text-lg font-semibold text-white tracking-tight">Performance por fecha</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: Math.max(totalDates, 12) }, (_, i) => {
                    const dateNumber = i + 1;
                    const date = details.datePerformance.find(d => d.dateNumber === dateNumber);
                    
                    if (!date || date.status === 'pending' || date.status === 'CREATED') {
                      return (
                        <div
                          key={dateNumber}
                          className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-center opacity-60"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">F{dateNumber}</div>
                          <div className="mt-1 text-sm text-white/40">Pendiente</div>
                        </div>
                      );
                    }

                    if (date.status === 'in_progress') {
                      return (
                        <div
                          key={dateNumber}
                          className="rounded-2xl border border-amber-400/60 bg-amber-400/10 px-4 py-3 text-center"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">F{dateNumber}</div>
                          <div className="mt-1 text-sm font-semibold text-amber-300">EN VIVO</div>
                          <div className="text-lg font-bold text-white">{date.points} pts</div>
                        </div>
                      );
                    }

                    const isElimina2Date = date.points === details.currentStats.elimina1 || 
                                          date.points === details.currentStats.elimina2;
                    
                    return (
                      <div key={dateNumber} className={`rounded-2xl border px-4 py-3 text-center ${
                        isElimina2Date
                          ? 'border-white/12 bg-white/5'
                          : 'border-poker-red/50 bg-gradient-to-br from-poker-red/20 via-[#d73552]/10 to-transparent'
                      }`}>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">F{dateNumber}</div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {date.isAbsent ? 'Ausente' : date.eliminationPosition ? `${date.eliminationPosition}° lugar` : 'Ganador'}
                        </div>
                        <div className="text-lg font-bold text-poker-gold">{date.points} pts</div>
                        <div className={`text-xs ${date.eliminatedBy?.isGuest ? 'text-pink-300' : 'text-orange-300'}`}>
                          {date.isAbsent ? 'No participó' : date.eliminationPosition ? (date.eliminatedBy?.alias || date.eliminatedBy?.name || 'Eliminado') : 'Campeón'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Ranking Evolution Chart */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-2xl border border-white/15 bg-white/5 text-center text-lg leading-9 text-emerald-300">📈</div>
                  <h3 className="text-lg font-semibold text-white tracking-tight">Evolución en el ranking</h3>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                  <RankingEvolutionChart 
                    data={details.rankingEvolution}
                    playerName={details.player.firstName}
                  />
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
