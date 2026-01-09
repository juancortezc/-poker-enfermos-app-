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
        className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/80 backdrop-blur-sm p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[#e0b66c]/15 bg-gradient-to-br from-[#24160f]/95 via-[#1f1410]/95 to-[#1a0f0c]/95 shadow-[0_40px_120px_rgba(8,6,3,0.8)] backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Noir texture overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(224,182,108,0.08),_transparent_60%)]" />

          {loading || !details ? (
            <div className="relative z-10 p-10 text-center">
              <div className="mb-5 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#e0b66c]/25 bg-[#2a1a14]/60">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e0b66c]/60 border-t-transparent" />
                </div>
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#e8e3e3]/70">
                Cargando detalles del jugador...
              </p>
              {error && (
                <p className="mt-3 text-sm text-[#f38b7d]">{error}</p>
              )}
            </div>
          ) : (
            <div className="relative z-10 space-y-8 p-5 sm:p-8 lg:p-10">
              {/* Header */}
              <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  {/* Foto del jugador */}
                  <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-3xl border border-[#e0b66c]/25 bg-[#2a1a14]/80 p-2 shadow-[0_24px_60px_rgba(11,6,3,0.65)] md:mx-0">
                    <div className="relative h-full w-full overflow-hidden rounded-2xl">
                      {details.player.photoUrl ? (
                        <Image
                          src={details.player.photoUrl}
                          alt={details.player.firstName}
                          fill
                          sizes="160px"
                          className="object-cover noir-photo"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e0b66c]/20 via-[#a9441c]/15 to-[#3c2219]/10 text-4xl text-[#e8e3e3]/60">
                          🏆
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1f1410]/80 via-[#1f1410]/40 to-transparent" />
                    </div>
                  </div>

                  <div className="space-y-4 text-center md:text-left">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#e8e3e3]/60">Jugador destacado</p>
                      <h2 className="font-heading text-3xl uppercase tracking-[0.16em] text-[#f3e6c5]">
                        {details.player.firstName} {details.player.lastName}
                      </h2>
                      {details.player.aliases.length > 0 && (
                        <p className="text-sm uppercase tracking-[0.24em] text-[#e0b66c]/80">
                          ({details.player.aliases.join(', ')})
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#e0b66c]/25 bg-[#2a1a14]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#e8e3e3]">
                        <Crown className="h-4 w-4 text-[#e0b66c]" />
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
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#e0b66c]/25 bg-[#2a1a14]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#e8e3e3]">
                            <Target className="h-4 w-4 text-[#e8e3e3]" />
                            <span>{daysWithoutVictory} días sin ganar</span>
                          </div>
                        )
                      })() : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#e0b66c]/25 bg-[#2a1a14]/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#e8e3e3]">
                          <Target className="h-4 w-4 text-[#e8e3e3]" />
                          <span>Sin victorias registradas</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e0b66c]/25 bg-[#2a1a14]/60 text-[#e8e3e3] transition-all hover:border-[#e0b66c]/45 hover:text-[#f3e6c5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              {/* Stats Cards */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Puntos acumulados',
                    value: `${details.currentStats.totalPoints}`,
                    accent: 'text-[#e0b66c]'
                  },
                  details.currentStats.finalScore !== undefined
                    ? {
                        label: 'Puntaje final proyectado',
                        value: `${details.currentStats.finalScore}`,
                        accent: 'text-[#e0b66c]/80'
                      }
                    : null,
                  {
                    label: 'Posición actual',
                    value: `${details.currentStats.position}°`,
                    accent: 'text-[#f3e6c5]'
                  },
                  {
                    label: 'Mejor resultado',
                    value: details.bestResult,
                    accent: 'text-[#7bdba5]'
                  },
                  {
                    label: 'Fechas jugadas',
                    value: `${totalCompletedDates}`,
                    suffix: totalDates ? `/${totalDates}` : undefined,
                    accent: 'text-[#f3e6c5]'
                  }
                ]
                  .filter(Boolean)
                  .map((card, index) => {
                    const { label, value, accent = 'text-[#f3e6c5]', suffix } = card as {
                      label: string
                      value: string
                      accent?: string
                      suffix?: string
                    }

                    return (
                      <div
                        key={`${label}-${index}`}
                        className="rounded-2xl border border-[#e0b66c]/15 bg-[#2a1a14]/60 p-4 text-center backdrop-blur-sm"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e8e3e3]/70">
                          {label}
                        </p>
                        <p className={`mt-2 font-heading text-3xl ${accent}`}>
                          {value}
                          {suffix && <span className="ml-1 text-sm text-[#e8e3e3]/50">{suffix}</span>}
                        </p>
                      </div>
                    )
                  })}
              </section>

              {/* Date Performance Grid */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-2xl border border-[#e0b66c]/25 bg-[#2a1a14]/60 text-center text-lg leading-9 text-[#e0b66c]">F</div>
                  <h3 className="font-heading text-lg uppercase tracking-[0.2em] text-[#f3e6c5]">Performance por fecha</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: Math.max(totalDates, 12) }, (_, i) => {
                    const dateNumber = i + 1;
                    const date = details.datePerformance.find(d => d.dateNumber === dateNumber);

                    if (!date || date.status === 'pending' || date.status === 'CREATED') {
                      return (
                        <div
                          key={dateNumber}
                          className="rounded-2xl border border-[#e0b66c]/12 bg-[#2a1a14]/40 px-4 py-3 text-center opacity-60"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8e3e3]/50">F{dateNumber}</div>
                          <div className="mt-1 text-sm text-[#e8e3e3]/40">Pendiente</div>
                        </div>
                      );
                    }

                    if (date.status === 'in_progress') {
                      return (
                        <div
                          key={dateNumber}
                          className="rounded-2xl border border-[#e0b66c]/50 bg-[#e0b66c]/10 px-4 py-3 text-center"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e0b66c]">F{dateNumber}</div>
                          <div className="mt-1 text-sm font-semibold text-[#e0b66c]">EN VIVO</div>
                          <div className="text-lg font-bold text-[#f3e6c5]">{date.points} pts</div>
                        </div>
                      );
                    }

                    const isElimina2Date = date.points === details.currentStats.elimina1 ||
                                          date.points === details.currentStats.elimina2;

                    return (
                      <div key={dateNumber} className={`rounded-2xl border px-4 py-3 text-center ${
                        isElimina2Date
                          ? 'border-[#e0b66c]/12 bg-[#2a1a14]/40'
                          : 'border-[#a9441c]/40 bg-gradient-to-br from-[#a9441c]/15 via-[#a9441c]/8 to-transparent'
                      }`}>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8e3e3]/70">F{dateNumber}</div>
                        <div className="mt-1 text-sm font-semibold text-[#f3e6c5]">
                          {date.isAbsent ? 'Ausente' : date.eliminationPosition ? `${date.eliminationPosition}° lugar` : 'Ganador'}
                        </div>
                        <div className="text-lg font-bold text-[#e0b66c]">{date.points} pts</div>
                        <div className={`text-xs ${date.eliminatedBy?.isGuest ? 'text-[#ec4899]' : 'text-[#e0b66c]/70'}`}>
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
                  <div className="h-9 w-9 rounded-2xl border border-[#e0b66c]/25 bg-[#2a1a14]/60 text-center text-lg leading-9 text-[#7bdba5]">📈</div>
                  <h3 className="font-heading text-lg uppercase tracking-[0.2em] text-[#f3e6c5]">Evolución en el ranking</h3>
                </div>
                <div className="rounded-2xl border border-[#e0b66c]/15 bg-[#2a1a14]/60 p-4 backdrop-blur-sm">
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
