'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  RotateCw,
  TrendingUp,
  TrendingDown,
  Minus,
  User
} from 'lucide-react'

import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import PlayerDetailModal from './PlayerDetailModal'
import { RankCard } from '@/components/noir/RankCard'
import { NoirButton } from '@/components/noir/NoirButton'
import type { PlayerRanking } from '@/lib/ranking-utils'
import { cn } from '@/lib/utils'

interface HomeRankingViewProps {
  tournamentId: number
}

type RowTrend = 'up' | 'down' | 'steady'

const trendStyles: Record<RowTrend, { label: string; className: string; icon: ReactNode }> = {
  up: {
    label: 'Sube',
    className: 'text-[#7bdba5]',
    icon: <TrendingUp className="h-3.5 w-3.5" />
  },
  down: {
    label: 'Baja',
    className: 'text-[#f38b7d]',
    icon: <TrendingDown className="h-3.5 w-3.5" />
  },
  steady: {
    label: 'Sin cambios',
    className: 'text-[#d7c59a]',
    icon: <Minus className="h-3.5 w-3.5" />
  }
}

interface PlayerRowProps {
  player: PlayerRanking
  onSelect: (playerId: string) => void
}

function PlayerRow({ player, onSelect }: PlayerRowProps) {
  const trend = player.trend === 'up' ? 'up' : player.trend === 'down' ? 'down' : 'steady'
  const trendInfo = trendStyles[trend]

  return (
    <button
      type="button"
      onClick={() => onSelect(player.playerId)}
      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[#e0b66c]/12 bg-[rgba(31,20,16,0.78)] px-4 py-3 text-left transition-all duration-200 hover:border-[#e0b66c]/35 hover:bg-[rgba(31,20,16,0.92)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e0b66c]/30 bg-[#24160f] font-semibold text-[11px] uppercase tracking-[0.22em] text-[#e0b66c]">
          #{String(player.position).padStart(2, '0')}
        </span>

        {player.playerPhoto ? (
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#e0b66c]/25 bg-[#2a1a14]">
            <Image
              src={player.playerPhoto}
              alt={player.playerName}
              fill
              sizes="40px"
              className="object-cover noir-photo"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0b66c]/25 bg-[#2a1a14] text-[#d7c59a]">
            <User className="h-5 w-5" />
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-[#f3e6c5]">
            {player.playerName}
          </p>
          {player.playerAlias && (
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#d7c59a]/65">
              {player.playerAlias}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
            <span className={cn('flex items-center gap-1', trendInfo.className)}>
              {trendInfo.icon}
              {trendInfo.label}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className="font-heading text-xl tracking-[0.18em] text-[#e0b66c]">
          {player.finalScore ?? player.totalPoints}
        </p>
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#d7c59a]/60">
          Total {player.totalPoints}
        </p>
      </div>
    </button>
  )
}

export default function HomeRankingView({ tournamentId }: HomeRankingViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const {
    ranking: rankingData,
    isLoading,
    isError,
    errorMessage,
    refresh
  } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  })

  const openPlayerModal = (playerId: string) => {
    setSelectedPlayerId(playerId)
    setIsModalOpen(true)
  }

  const closePlayerModal = () => {
    setIsModalOpen(false)
    setSelectedPlayerId(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mx-auto h-6 w-56 animate-pulse rounded-full bg-[#2a1a14]/60" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-48 animate-pulse rounded-3xl border border-[#e0b66c]/12 bg-[rgba(31,20,16,0.65)]"
            />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-[#e0b66c]/12 bg-[rgba(31,20,16,0.65)] p-6">
          {[...Array(4)].map((_, index) => (
            <div
              key={`row-skeleton-${index}`}
              className="h-14 animate-pulse rounded-xl bg-[#24160f]"
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="paper space-y-4 px-6 py-8 text-center">
        <h3 className="font-heading text-lg uppercase tracking-[0.24em] text-[#e0b66c]">
          Error al cargar el ranking
        </h3>
        <p className="text-sm text-[#d7c59a]">{errorMessage}</p>
        <div className="flex items-center justify-center">
          <NoirButton onClick={refresh} className="gap-2">
            <RotateCw className="h-4 w-4" />
            Reintentar
          </NoirButton>
        </div>
      </div>
    )
  }

  if (!rankingData || rankingData.rankings.length === 0) {
    return (
      <div className="paper px-6 py-8 text-center">
        <p className="text-[#d7c59a]">
          No hay datos de ranking disponibles todavía. Regresa cuando tengamos nuevas fechas.
        </p>
      </div>
    )
  }

  const { rankings, tournament } = rankingData
  const topThree = rankings.slice(0, 3)
  const others = rankings.slice(3)
  const highlightOrder: Array<'gold' | 'silver' | 'bronze'> = ['gold', 'silver', 'bronze']

  // Identificar las 2 últimas posiciones para aplicar highlight pink (premio 7/2)
  const totalPlayers = rankings.length
  const lastTwoPositions = [totalPlayers - 1, totalPlayers] // Últimas 2 posiciones

  return (
    <section className="space-y-8">
      <header className="text-center space-y-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#d7c59a]/75">
          Torneo #{tournament.number} · {tournament.name}
        </p>
        <h2 className="font-heading text-3xl uppercase tracking-[0.22em] text-[#f3e6c5]">
          Tabla General
        </h2>
        <p className="text-sm text-[#d7c59a]/70">
          {rankings.length} jugadores · {tournament.completedDates}/{tournament.totalDates} fechas completadas
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {topThree.map((player, index) => (
          <button
            key={player.playerId}
            type="button"
            onClick={() => openPlayerModal(player.playerId)}
            className="text-left"
          >
            <RankCard
              position={player.position}
              name={player.playerName}
              alias={player.playerAlias}
              points={player.finalScore ?? player.totalPoints}
              trend={player.trend === 'up' ? 'up' : player.trend === 'down' ? 'down' : 'steady'}
              meta={`Total ${player.totalPoints} pts`}
              highlight={highlightOrder[index] ?? 'default'}
              avatarUrl={player.playerPhoto}
              footer={`Victorias ${player.firstPlaces} · Podios ${player.firstPlaces + player.secondPlaces + player.thirdPlaces}`}
            />
          </button>
        ))}
      </div>

      {others.length > 0 && (
        <>
          <div className="paper space-y-4 px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-heading text-sm uppercase tracking-[0.26em] text-[#e0b66c]">
                Clasificación extendida
              </h3>
              <NoirButton
                variant="ghost"
                size="sm"
                onClick={refresh}
                className="self-start gap-2 px-3 py-2 text-[10px]"
              >
                <RotateCw className="h-4 w-4" />
                Actualizar
              </NoirButton>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {others
                .filter(player => !lastTwoPositions.includes(player.position))
                .map((player) => (
                  <PlayerRow
                    key={player.playerId}
                    player={player}
                    onSelect={openPlayerModal}
                  />
                ))}
            </div>
          </div>

          {/* Sección 7/2: Últimas 2 posiciones con cards grandes y pink */}
          {others.filter(player => lastTwoPositions.includes(player.position)).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-center font-heading text-lg uppercase tracking-[0.24em] text-[#ec4899]">
                Malazos
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {others
                  .filter(player => lastTwoPositions.includes(player.position))
                  .map((player) => (
                    <button
                      key={player.playerId}
                      type="button"
                      onClick={() => openPlayerModal(player.playerId)}
                      className="text-left"
                    >
                      <RankCard
                        position={player.position}
                        name={player.playerName}
                        alias={player.playerAlias}
                        points={player.finalScore ?? player.totalPoints}
                        trend={player.trend === 'up' ? 'up' : player.trend === 'down' ? 'down' : 'steady'}
                        meta={`Total ${player.totalPoints} pts`}
                        highlight="pink"
                        avatarUrl={player.playerPhoto}
                        footer={`Victorias ${player.firstPlaces} · Podios ${player.firstPlaces + player.secondPlaces + player.thirdPlaces}`}
                      />
                    </button>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedPlayerId && (
        <PlayerDetailModal
          isOpen={isModalOpen}
          onClose={closePlayerModal}
          playerId={selectedPlayerId}
          tournamentId={tournamentId}
        />
      )}
    </section>
  )
}
