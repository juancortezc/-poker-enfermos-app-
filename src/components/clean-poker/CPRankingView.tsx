'use client'

import { useState } from 'react'
import Image from 'next/image'
import { RotateCw } from 'lucide-react'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import { CPPlayerDetailModal } from './CPPlayerDetailModal'
import type { PlayerRanking } from '@/lib/ranking-utils'

interface CPRankingViewProps {
  tournamentId: number
}

function shortName(full: string) {
  const p = full.split(' ').filter(Boolean)
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]
}

function trendColor(t: string) {
  if (t === 'up') return '#4CAF50'
  if (t === 'down') return '#E53935'
  return '#888'
}
function trendLabel(player: PlayerRanking) {
  if (player.positionsChanged === 0) return '●'
  const sym = player.trend === 'up' ? '▲' : '▼'
  return `${sym}${Math.abs(player.positionsChanged)}`
}

// ── HERO CARD ── #1 full-width
function HeroCard({ player, onClick }: { player: PlayerRanking; onClick: () => void }) {
  const pts = player.finalScore ?? player.totalPoints
  return (
    <button
      onClick={onClick}
      className="w-full relative overflow-hidden text-left"
      style={{
        borderRadius: '10px',
        minHeight: '150px',
        backgroundColor: '#1e1600',
        backgroundImage: `url('/textures/noise.png'), linear-gradient(135deg, #1e1600 0%, #342200 55%, #1c1400 100%)`,
        backgroundSize: '160px 160px, 100% 100%',
        backgroundRepeat: 'repeat, no-repeat',
        backgroundBlendMode: 'soft-light, normal',
        border: '1px solid rgba(255,210,0,0.52)',
        boxShadow: '0 16px 44px rgba(0,0,0,0.75), 0 0 50px rgba(255,185,0,0.35)',
      }}
    >
      {/* Photo right */}
      {player.playerPhoto && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '130px', pointerEvents: 'none' }}>
          <Image src={player.playerPhoto} alt={player.playerName} fill className="object-cover object-top" unoptimized />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #1e1600 0%, rgba(30,22,0,0.5) 45%, transparent 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(20,14,0,0.75) 100%)' }} />
        </div>
      )}

      {/* Content left */}
      <div style={{ padding: '14px 16px', position: 'relative', zIndex: 1, maxWidth: player.playerPhoto ? '62%' : '100%' }}>
        <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFD700', letterSpacing: '0.18em' }}>LÍDER · T30</span>

        <div className="flex items-baseline gap-2 mt-1">
          <span style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
            #1
          </span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>
            {shortName(player.playerName)}
          </span>
        </div>

        <div className="flex items-end gap-4 mt-3">
          <div>
            <p style={{ fontSize: '22px', fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>{pts}</p>
            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.40)' }}>pts finales</p>
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>{player.totalPoints}</p>
            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.30)' }}>total</p>
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: trendColor(player.trend), lineHeight: 1 }}>
              {trendLabel(player)}
            </p>
            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.30)' }}>cambio</p>
          </div>
        </div>
      </div>
    </button>
  )
}

// ── PODIUM CARD ── #2 / #3 side by side
function PodiumCard({ player, onClick }: { player: PlayerRanking; onClick: () => void }) {
  const pos = player.position as 2 | 3
  const pts = player.finalScore ?? player.totalPoints
  const avatarSize = 88

  const cardStyle = pos === 2
    ? { bg: 'linear-gradient(165deg, #0e0e18 0%, #181826 50%, #0e0e18 100%)', border: 'rgba(200,210,240,0.42)', glow: 'rgba(180,190,230,0.22)' }
    : { bg: 'linear-gradient(165deg, #1a0e00 0%, #2c1800 50%, #1a0e00 100%)', border: 'rgba(205,130,50,0.48)', glow: 'rgba(185,105,30,0.22)' }

  const medalColor = pos === 2 ? '#C8C8D8' : '#CD7F32'

  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center relative pt-12 pb-3 px-2"
      style={{
        borderRadius: '5px',
        background: cardStyle.bg,
        border: `1px solid ${cardStyle.border}`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.70), 0 0 30px ${cardStyle.glow}, inset 0 1px 0 ${cardStyle.border}`,
        marginTop: '40px',
        minHeight: '160px',
      }}
    >
      {/* Avatar overflow */}
      <div
        className="absolute overflow-hidden"
        style={{
          width: avatarSize, height: avatarSize,
          top: `-${avatarSize / 2}px`,
          left: '50%', transform: 'translateX(-50%)',
          borderRadius: '5px',
          background: player.playerPhoto ? 'transparent' : 'var(--cp-surface-solid)',
          boxShadow: `0 6px 18px rgba(0,0,0,0.65), 0 0 16px ${cardStyle.glow}`,
        }}
      >
        {player.playerPhoto ? (
          <Image src={player.playerPhoto} alt={player.playerName} width={avatarSize} height={avatarSize} className="object-cover w-full h-full" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontSize: '20px', fontWeight: 900, color: medalColor }}>{pos}</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: '18px', fontWeight: 900, color: medalColor, marginBottom: '2px' }}>#{pos}</p>
      <p className="truncate w-full text-center" style={{ fontSize: '11px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
        {shortName(player.playerName)}
      </p>

      <div style={{ width: '100%', height: '1px', background: medalColor, opacity: 0.4, marginBottom: '6px' }} />

      <div className="flex items-baseline gap-2 justify-center">
        <div className="text-center">
          <p style={{ fontSize: '16px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pts}</p>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.38)' }}>final</p>
        </div>
        <div className="text-center">
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>{player.totalPoints}</p>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.28)' }}>total</p>
        </div>
      </div>

      <p style={{ fontSize: '10px', color: trendColor(player.trend), fontWeight: 700, marginTop: '4px' }}>
        {trendLabel(player)}
      </p>
    </button>
  )
}

// ── PLAYER ROW ── positions 4+
function PlayerRow({ player, rank, isMalazo = false, onClick }: {
  player: PlayerRanking; rank: number; isMalazo?: boolean; onClick: () => void
}) {
  const pts = player.finalScore ?? player.totalPoints
  const pink = '#EC407A'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 transition-all hover:brightness-125"
      style={{
        padding: '9px 12px',
        borderRadius: '5px',
        background: isMalazo
          ? 'linear-gradient(135deg, rgba(80,8,38,0.80) 0%, rgba(140,20,70,0.70) 100%)'
          : 'linear-gradient(135deg, rgba(40,8,20,0.80) 0%, rgba(55,12,28,0.70) 100%)',
        border: `1px solid ${isMalazo ? 'rgba(236,64,122,0.24)' : 'rgba(200,30,70,0.16)'}`,
        boxShadow: isMalazo
          ? '0 4px 14px rgba(0,0,0,0.45), 0 0 16px rgba(200,30,90,0.10)'
          : '0 3px 10px rgba(0,0,0,0.40)',
      }}
    >
      {/* Position number */}
      <span
        style={{
          fontSize: '12px', fontWeight: 800,
          color: isMalazo ? pink : 'rgba(255,255,255,0.32)',
          width: '20px', textAlign: 'center', flexShrink: 0,
        }}
      >
        {rank}
      </span>

      {/* Photo */}
      <div
        style={{
          width: 40, height: 40, flexShrink: 0, overflow: 'hidden',
          borderRadius: '5px',
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid ${isMalazo ? 'rgba(236,64,122,0.30)' : 'rgba(255,255,255,0.10)'}`,
        }}
      >
        {player.playerPhoto ? (
          <Image src={player.playerPhoto} alt={player.playerName} width={40} height={40} className="object-cover w-full h-full" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)', fontWeight: 700 }}>
              {player.playerName.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0 text-left">
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {shortName(player.playerName)}
        </p>
        <p style={{ fontSize: '9px', color: trendColor(player.trend), fontWeight: 600 }}>
          {trendLabel(player)}
        </p>
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <p style={{ fontSize: '15px', fontWeight: 800, color: isMalazo ? pink : '#fff' }}>{pts}</p>
        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>{player.totalPoints} tot</p>
      </div>
    </button>
  )
}

// ── MAIN ──
export function CPRankingView({ tournamentId }: CPRankingViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const { ranking: rankingData, isLoading, isError, errorMessage, refresh } = useTournamentRanking(tournamentId, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <div className="h-36 animate-pulse" style={{ borderRadius: '5px', background: 'rgba(255,185,0,0.08)' }} />
        <div className="flex gap-2">
          {[0, 1].map(i => <div key={i} className="flex-1 h-44 animate-pulse" style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.05)' }} />)}
        </div>
        {[0,1,2,3].map(i => <div key={i} className="h-14 animate-pulse" style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.04)' }} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 text-center" style={{ borderRadius: '5px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: '14px', color: '#fff' }}>Error al cargar el ranking</p>
        <p className="mt-1" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{errorMessage}</p>
        <button onClick={() => refresh()} className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-full" style={{ border: '1px solid #E53935', color: '#E53935', fontSize: '12px' }}>
          <RotateCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    )
  }

  if (!rankingData || rankingData.rankings.length === 0) {
    return (
      <div className="p-6 text-center" style={{ borderRadius: '5px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>No hay datos de ranking disponibles.</p>
      </div>
    )
  }

  const { rankings, tournament } = rankingData
  const leader = rankings[0]
  const second = rankings.find(p => p.position === 2)
  const third = rankings.find(p => p.position === 3)
  const middle = rankings.slice(3, -2)
  const bottom2 = rankings.length > 4 ? rankings.slice(-2) : []

  return (
    <div className="space-y-2 pt-2">
      {/* Dates count - subtle */}
      <p className="text-center" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', marginBottom: '4px' }}>
        {tournament.completedDates}/{tournament.totalDates} FECHAS JUGADAS
      </p>

      {/* #1 Hero card */}
      {leader && (
        <HeroCard player={leader} onClick={() => setSelectedPlayerId(leader.playerId)} />
      )}

      {/* #2 and #3 side by side */}
      {(second || third) && (
        <div className="flex gap-2 items-start" style={{ marginTop: '40px' }}>
          {second && <PodiumCard player={second} onClick={() => setSelectedPlayerId(second.playerId)} />}
          {third && <PodiumCard player={third} onClick={() => setSelectedPlayerId(third.playerId)} />}
        </div>
      )}

      {/* Middle players */}
      {middle.length > 0 && (
        <div className="space-y-1.5 pt-2">
          {middle.map(player => (
            <PlayerRow
              key={player.playerId}
              player={player}
              rank={player.position}
              onClick={() => setSelectedPlayerId(player.playerId)}
            />
          ))}
        </div>
      )}

      {/* 7/2 */}
      {bottom2.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-center" style={{ fontSize: '9px', fontWeight: 700, color: '#EC407A', letterSpacing: '0.14em' }}>
            7 / 2
          </p>
          {bottom2.map(player => (
            <PlayerRow
              key={player.playerId}
              player={player}
              rank={player.position}
              isMalazo
              onClick={() => setSelectedPlayerId(player.playerId)}
            />
          ))}
        </div>
      )}

      {/* Player Detail Modal */}
      <CPPlayerDetailModal
        isOpen={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        playerId={selectedPlayerId || ''}
        tournamentId={tournamentId}
      />
    </div>
  )
}

export default CPRankingView
