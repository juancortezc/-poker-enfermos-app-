'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import Image from 'next/image'

import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPlayerDetailModal } from '@/components/clean-poker/CPPlayerDetailModal'

export default function PosicionesPage() {
  const { user, loading: authLoading } = useAuth()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
  } = useActiveTournament({ refreshInterval: 300000 }) // 5 minutes

  const {
    ranking: rankingData,
    isLoading: rankingLoading,
  } = useTournamentRanking(activeTournament?.id || null, {
    refreshInterval: 300000 // 5 minutes
  })

  // Loading state
  if (authLoading || tournamentLoading || rankingLoading) {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{
                borderColor: 'var(--cp-surface-border)',
                borderTopColor: 'var(--cp-primary)'
              }}
            />
            <p
              style={{
                fontSize: 'var(--cp-body-size)',
                color: 'var(--cp-on-surface-variant)'
              }}
            >
              Cargando posiciones...
            </p>
          </div>
        </div>
      </CPAppShell>
    )
  }

  const rankings = rankingData?.rankings || []
  const tournamentNumber = activeTournament?.number ?? 29
  const userInitials = user?.firstName?.slice(0, 2).toUpperCase() || 'PE'
  const isComision = user?.role === 'Comision'

  // Split rankings into sections
  const top3 = rankings.slice(0, 3)
  const middle = rankings.slice(3, -2)
  const bottom2 = rankings.length >= 2 ? rankings.slice(-2) : []

  return (
    <CPAppShell>
      {/* Header */}
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user?.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isComision}
      />

      {/* Content */}
      <main className="pb-20 px-4 space-y-4">
        {/* Page Title */}
        <h1
          className="text-center"
          style={{
            fontSize: 'var(--cp-title-size)',
            color: 'var(--cp-on-surface)',
            fontWeight: 600,
          }}
        >
          Posiciones
        </h1>

        {/* Top 3 - Larger cards, 3 per row */}
        {top3.length > 0 && (
          <section>
            <p
              className="text-center mb-3"
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-variant)',
              }}
            >
              Podio
            </p>
            <div className="grid grid-cols-3 gap-2">
              {top3.map((player) => (
                <TopPlayerCard
                  key={player.playerId}
                  player={player}
                  onSelect={setSelectedPlayerId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Middle players - Regular cards */}
        {middle.length > 0 && (
          <section className="space-y-2">
            {middle.map((player) => (
              <PlayerRowCard
                key={player.playerId}
                player={player}
                onSelect={setSelectedPlayerId}
              />
            ))}
          </section>
        )}

        {/* Bottom 2 - Malazo section */}
        {bottom2.length >= 2 && (
          <section>
            <p
              className="text-center mb-3"
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: '#EC407A',
              }}
            >
              7/2
            </p>
            <div className="grid grid-cols-2 gap-3">
              {bottom2.map((player) => (
                <MalazoPlayerCard
                  key={player.playerId}
                  player={player}
                  onSelect={setSelectedPlayerId}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Nav */}
      <CPBottomNav />

      {/* Player Detail Modal */}
      <CPPlayerDetailModal
        isOpen={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        playerId={selectedPlayerId || ''}
        tournamentId={activeTournament?.id || 0}
      />
    </CPAppShell>
  )
}

// ============================================
// TOP PLAYER CARD (Podio - larger, 3 per row)
// ============================================
interface PlayerCardProps {
  player: {
    position: number
    playerId: string
    playerName: string
    playerPhoto?: string
    totalPoints: number
    finalScore?: number
    positionsChanged: number
    firstPlaces: number
    secondPlaces: number
    thirdPlaces: number
    lastPlaces: number
    absences: number
  }
  onSelect: (playerId: string) => void
}

function TopPlayerCard({ player, onSelect }: PlayerCardProps) {
  const getMedalColor = (position: number) => {
    if (position === 1) return '#FFD700'
    if (position === 2) return '#C0C0C0'
    if (position === 3) return '#CD7F32'
    return 'var(--cp-on-surface-variant)'
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return '#4CAF50'
    if (trend < 0) return '#E53935'
    return '#FFC107'
  }

  const getTrendSymbol = (trend: number) => {
    if (trend > 0) return '▲'
    if (trend < 0) return '▼'
    return '●'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const finalPoints = player.finalScore ?? player.totalPoints
  const podiums = player.firstPlaces + player.secondPlaces + player.thirdPlaces

  return (
    <button
      onClick={() => onSelect(player.playerId)}
      className="group rounded-xl p-3 flex flex-col items-center w-full transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(128,128,128,0.3)] active:scale-[0.98] cursor-pointer"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${getMedalColor(player.position)}33`,
        minHeight: '160px',
      }}
    >
      {/* Avatar */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center mb-2"
        style={{
          width: 48,
          height: 48,
          background: player.playerPhoto ? 'transparent' : 'var(--cp-surface-solid)',
          border: `2px solid ${getMedalColor(player.position)}`,
        }}
      >
        {player.playerPhoto ? (
          <Image
            src={player.playerPhoto}
            alt={player.playerName}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        ) : (
          <span
            className="font-semibold"
            style={{
              fontSize: '12px',
              color: 'var(--cp-on-surface-variant)',
            }}
          >
            {getInitials(player.playerName)}
          </span>
        )}
      </div>

      {/* Position */}
      <p
        className="font-bold"
        style={{
          fontSize: '14px',
          color: getMedalColor(player.position),
        }}
      >
        #{player.position}
      </p>

      {/* Name */}
      <p
        className="text-center font-medium truncate w-full"
        style={{
          fontSize: '11px',
          color: 'var(--cp-on-surface)',
        }}
      >
        {player.playerName.split(' ')[0]}
      </p>

      {/* Points */}
      <p
        className="font-bold"
        style={{
          fontSize: '16px',
          color: 'var(--cp-on-surface)',
        }}
      >
        {finalPoints}
      </p>

      {/* Trend */}
      <div className="flex items-center gap-1">
        <span style={{ fontSize: '8px', color: getTrendColor(player.positionsChanged) }}>
          {getTrendSymbol(player.positionsChanged)}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          {Math.abs(player.positionsChanged)}
        </span>
      </div>

      {/* Stats */}
      <p
        style={{
          fontSize: '9px',
          color: 'var(--cp-on-surface-muted)',
          marginTop: '4px',
        }}
      >
        {player.firstPlaces}V · {podiums}P
      </p>
    </button>
  )
}

// ============================================
// PLAYER ROW CARD (Middle players)
// ============================================
function PlayerRowCard({ player, onSelect }: PlayerCardProps) {
  const getTrendColor = (trend: number) => {
    if (trend > 0) return '#4CAF50'
    if (trend < 0) return '#E53935'
    return '#FFC107'
  }

  const getTrendSymbol = (trend: number) => {
    if (trend > 0) return '▲'
    if (trend < 0) return '▼'
    return '●'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const finalPoints = player.finalScore ?? player.totalPoints

  return (
    <button
      onClick={() => onSelect(player.playerId)}
      className="group rounded-xl px-3 py-2 flex items-center gap-3 w-full text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(128,128,128,0.25)] active:scale-[0.99] cursor-pointer"
      style={{
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Position */}
      <span
        className="font-bold shrink-0"
        style={{
          fontSize: '14px',
          color: 'var(--cp-on-surface-variant)',
          width: '32px',
        }}
      >
        #{player.position}
      </span>

      {/* Avatar */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{
          width: 36,
          height: 36,
          background: player.playerPhoto ? 'transparent' : 'var(--cp-surface-solid)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        {player.playerPhoto ? (
          <Image
            src={player.playerPhoto}
            alt={player.playerName}
            width={36}
            height={36}
            className="object-cover w-full h-full"
          />
        ) : (
          <span
            className="font-semibold"
            style={{
              fontSize: '11px',
              color: 'var(--cp-on-surface-variant)',
            }}
          >
            {getInitials(player.playerName)}
          </span>
        )}
      </div>

      {/* Name */}
      <p
        className="flex-1 font-medium truncate"
        style={{
          fontSize: '13px',
          color: 'var(--cp-on-surface)',
        }}
      >
        {player.playerName}
      </p>

      {/* Points */}
      <p
        className="font-bold shrink-0"
        style={{
          fontSize: '14px',
          color: 'var(--cp-on-surface)',
        }}
      >
        {finalPoints}
      </p>

      {/* Trend */}
      <div className="flex items-center gap-0.5 shrink-0" style={{ width: '32px' }}>
        <span style={{ fontSize: '8px', color: getTrendColor(player.positionsChanged) }}>
          {getTrendSymbol(player.positionsChanged)}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          {Math.abs(player.positionsChanged)}
        </span>
      </div>
    </button>
  )
}

// ============================================
// MALAZO PLAYER CARD (Bottom 2 - pink theme)
// ============================================
// Uses same PlayerCardProps interface since ranking data includes all fields

function MalazoPlayerCard({ player, onSelect }: PlayerCardProps) {
  const PINK_COLOR = '#EC407A'

  const getTrendColor = (trend: number) => {
    if (trend > 0) return '#4CAF50'
    if (trend < 0) return '#E53935'
    return '#FFC107'
  }

  const getTrendSymbol = (trend: number) => {
    if (trend > 0) return '▲'
    if (trend < 0) return '▼'
    return '●'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const finalPoints = player.finalScore ?? player.totalPoints

  return (
    <button
      onClick={() => onSelect(player.playerId)}
      className="group rounded-xl p-3 flex flex-col items-center w-full transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(128,128,128,0.3)] active:scale-[0.98] cursor-pointer"
      style={{
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(236, 64, 122, 0.2) 100%)',
        border: `1px solid ${PINK_COLOR}33`,
        minHeight: '160px',
      }}
    >
      {/* Avatar */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center mb-2"
        style={{
          width: 48,
          height: 48,
          background: player.playerPhoto ? 'transparent' : 'var(--cp-surface-solid)',
          border: `2px solid ${PINK_COLOR}`,
        }}
      >
        {player.playerPhoto ? (
          <Image
            src={player.playerPhoto}
            alt={player.playerName}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        ) : (
          <span
            className="font-semibold"
            style={{
              fontSize: '12px',
              color: 'var(--cp-on-surface-variant)',
            }}
          >
            {getInitials(player.playerName)}
          </span>
        )}
      </div>

      {/* Position */}
      <p
        className="font-bold"
        style={{
          fontSize: '14px',
          color: PINK_COLOR,
        }}
      >
        #{player.position}
      </p>

      {/* Name */}
      <p
        className="text-center font-medium truncate w-full"
        style={{
          fontSize: '11px',
          color: 'var(--cp-on-surface)',
        }}
      >
        {player.playerName.split(' ')[0]}
      </p>

      {/* Points */}
      <p
        className="font-bold"
        style={{
          fontSize: '16px',
          color: 'var(--cp-on-surface)',
        }}
      >
        {finalPoints}
      </p>

      {/* Trend */}
      <div className="flex items-center gap-1">
        <span style={{ fontSize: '8px', color: getTrendColor(player.positionsChanged) }}>
          {getTrendSymbol(player.positionsChanged)}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          {Math.abs(player.positionsChanged)}
        </span>
      </div>

      {/* Stats */}
      <div
        className="flex items-center gap-2 mt-1"
        style={{
          fontSize: '9px',
          color: 'var(--cp-on-surface-muted)',
        }}
      >
        <span style={{ color: player.lastPlaces > 0 ? PINK_COLOR : undefined }}>
          {player.lastPlaces} últ
        </span>
        <span style={{ color: player.absences > 0 ? '#E53935' : undefined }}>
          {player.absences} falt
        </span>
      </div>
    </button>
  )
}
