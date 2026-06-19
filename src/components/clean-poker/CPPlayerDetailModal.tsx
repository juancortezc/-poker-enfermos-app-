'use client'

import { X, Crown, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Image from 'next/image'
import { useMemo } from 'react'
import { usePlayerTournamentDetails } from '@/hooks/usePlayerTournamentDetails'
import useSWR from 'swr'

interface ChampionPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  isActive: boolean
  aliases: string[]
}

interface ChampionData {
  player: ChampionPlayer | null
  championshipsCount: number
  tournamentNumbers: number[]
}

interface ChampionStatsResponse {
  success: boolean
  data?: {
    all: ChampionData[]
    top3: ChampionData[]
    others: ChampionData[]
    totalChampions: number
    totalChampionships: number
  }
  error?: string
}

interface CPPlayerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  playerId: string
  tournamentId: number
}

export function CPPlayerDetailModal({
  isOpen,
  onClose,
  playerId,
  tournamentId
}: CPPlayerDetailModalProps) {
  const { details, loading, error } = usePlayerTournamentDetails(
    isOpen ? playerId : '',
    isOpen ? tournamentId : 0
  )

  const { data: championStats } = useSWR<ChampionStatsResponse>(
    isOpen ? '/api/tournaments/champions-stats' : null,
    (url: string) => fetch(url).then(res => res.json() as Promise<ChampionStatsResponse>)
  )

  const playerChampionships = championStats?.data?.all?.find(
    (champion) => champion.player?.id === playerId
  )

  const completedDates = details?.datePerformance
    ? details.datePerformance.filter(date => date && date.status === 'completed')
    : []
  const participatedDates = completedDates.filter(date => !date.isAbsent).length
  const totalCompletedDates = completedDates.length
  const totalDates = details?.datePerformance?.length ?? 0

  // Compute WHICH specific dates are eliminated by ranking them, not by matching point values
  const eliminatedDateNumbers = useMemo(() => {
    if (!details || !details.currentStats.eliminasActive) return new Set<number>()

    const n = details.datesToEliminate
    if (n <= 0) return new Set<number>()

    const played = details.datePerformance.filter(
      d => d.status === 'completed' && !d.isAbsent && d.points > 0
    )

    // Sort ascending by points; for equal points, higher dateNumber is eliminated first
    const sorted = [...played].sort((a, b) =>
      a.points !== b.points ? a.points - b.points : b.dateNumber - a.dateNumber
    )

    return new Set(sorted.slice(0, n).map(d => d.dateNumber))
  }, [details])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto"
        style={{
          borderRadius: '18px 18px 0 0',
          backgroundImage: `url('/textures/noise.png'), linear-gradient(180deg, #1a0610 0%, #120008 40%, #0e0006 100%)`,
          backgroundSize: '180px 180px, 100% 100%',
          backgroundRepeat: 'repeat, no-repeat',
          backgroundBlendMode: 'soft-light, normal',
          border: '1px solid rgba(220,40,80,0.22)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.80), 0 0 60px rgba(160,8,45,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {loading || !details ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: 'rgba(229,57,53,0.25)', borderTopColor: '#E53935' }} />
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Cargando...</p>
            {error && <p className="mt-2" style={{ color: '#E53935', fontSize: '11px' }}>{error}</p>}
          </div>
        ) : (
          <div className="px-4 pb-8 space-y-4">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.50)' }} />
            </button>

            {/* ── HEADER ── */}
            <header className="flex items-center gap-4 pr-8 pt-1">
              {/* Photo — square 5px radius */}
              <div
                className="overflow-hidden shrink-0 flex items-center justify-center"
                style={{
                  width: 80, height: 80,
                  borderRadius: '5px',
                  background: details.player.photoUrl ? 'transparent' : 'rgba(55,8,28,0.84)',
                  border: '1px solid rgba(220,40,80,0.35)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.60), 0 0 16px rgba(180,15,55,0.20)',
                }}
              >
                {details.player.photoUrl ? (
                  <Image src={details.player.photoUrl} alt={details.player.firstName}
                    width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <span style={{ fontSize: '22px', fontWeight: 900, color: 'rgba(255,255,255,0.30)' }}>
                    {details.player.firstName[0]}{details.player.lastName[0]}
                  </span>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                  {details.player.firstName} {details.player.lastName}
                </h2>
                {details.player.aliases.length > 0 && (
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', marginTop: '2px' }}>
                    {details.player.aliases.join(', ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.28)' }}>
                    <Crown className="w-3 h-3" style={{ color: '#FFD700' }} />
                    <span style={{ fontSize: '10px', color: '#FFD700', fontWeight: 700 }}>
                      {playerChampionships?.championshipsCount || 0}
                    </span>
                  </div>
                  {details.player.lastVictoryDate && (() => {
                    const [day, month, year] = details.player.lastVictoryDate.split('/').map(Number)
                    const victoryDate = new Date(year, month - 1, day)
                    const today = new Date()
                    const days = Math.floor((today.getTime() - victoryDate.getTime()) / (1000 * 3600 * 24))
                    return (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <Target className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)' }}>{days}d</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </header>

            {/* ── MAIN STATS ── */}
            <section className="grid grid-cols-3 gap-2">
              {/* Posición — accent highlight */}
              <div className="p-3 text-center"
                style={{
                  borderRadius: '5px',
                  background: 'linear-gradient(135deg, rgba(220,40,80,0.15) 0%, rgba(120,10,40,0.20) 100%)',
                  border: '1px solid rgba(220,40,80,0.30)',
                  boxShadow: '0 0 16px rgba(220,40,80,0.10)',
                }}>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Posición
                </p>
                <p style={{ fontSize: '26px', fontWeight: 900, color: '#E53935', lineHeight: 1.1 }}>
                  #{details.currentStats.position}
                </p>
              </div>
              <div className="p-3 text-center"
                style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Final</p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                  {details.currentStats.finalScore ?? details.currentStats.totalPoints}
                </p>
              </div>
              <div className="p-3 text-center"
                style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.50)', lineHeight: 1.1 }}>
                  {details.currentStats.totalPoints}
                </p>
              </div>
            </section>

            {/* ── SECONDARY STATS ── */}
            <section className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2.5"
                style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Mejor resultado
                </p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#4CAF50', marginTop: '2px' }}>
                  {details.bestResult}
                </p>
              </div>
              <div className="px-3 py-2.5"
                style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Fechas jugadas
                </p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
                  {participatedDates}/{totalCompletedDates}
                </p>
              </div>
            </section>

            {/* ── EVOLUTION CHART ── */}
            {details.rankingEvolution && details.rankingEvolution.length > 1 && (
              <section>
                <SectionLabel>Evolución de posición</SectionLabel>
                <PositionEvolutionChart evolution={details.rankingEvolution} />
              </section>
            )}

            {/* ── DATE RESULTS ── */}
            <section>
              <SectionLabel>Resultados por fecha</SectionLabel>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: Math.max(totalDates, 12) }, (_, i) => {
                  const dateNumber = i + 1
                  const date = details.datePerformance.find(d => d.dateNumber === dateNumber)
                  return (
                    <DateCard
                      key={dateNumber}
                      dateNumber={dateNumber}
                      date={date}
                      isElimina={eliminatedDateNumbers.has(dateNumber)}
                    />
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SECTION LABEL ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div style={{ width: '3px', height: '12px', borderRadius: '2px', background: '#E53935', flexShrink: 0 }} />
      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
        {children}
      </p>
    </div>
  )
}

// ── DATE CARD ──
interface DateCardProps {
  dateNumber: number
  date?: {
    status: string
    points: number
    isAbsent?: boolean
    eliminationPosition?: number
    eliminatedBy?: { name?: string; alias?: string; isGuest?: boolean }
  }
  isElimina: boolean
}

function DateCard({ dateNumber, date, isElimina }: DateCardProps) {
  if (!date || date.status === 'pending' || date.status === 'CREATED') {
    return (
      <div className="rounded p-2 text-center opacity-30"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>F{dateNumber}</p>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.20)' }}>—</p>
      </div>
    )
  }

  if (date.status === 'in_progress') {
    return (
      <div className="rounded p-2 text-center"
        style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.40)' }}>
        <p style={{ fontSize: '9px', color: '#E53935' }}>F{dateNumber}</p>
        <p style={{ fontSize: '12px', fontWeight: 800, color: '#E53935' }}>{date.points}</p>
        <p style={{ fontSize: '7px', color: '#E53935' }}>VIVO</p>
      </div>
    )
  }

  const isWinner = !date.eliminationPosition
  const isAbsent = date.isAbsent
  const isLast = date.eliminationPosition && date.points <= 1

  let bg = 'rgba(255,255,255,0.04)'
  let border = 'rgba(255,255,255,0.08)'
  let ptsColor = 'rgba(255,255,255,0.70)'

  if (isElimina) {
    bg = 'rgba(255,255,255,0.02)'
    border = 'rgba(255,255,255,0.05)'
    ptsColor = 'rgba(255,255,255,0.25)'
  } else if (isWinner) {
    bg = 'rgba(255,215,0,0.10)'
    border = 'rgba(255,215,0,0.40)'
    ptsColor = '#FFD700'
  } else if (isAbsent) {
    bg = 'rgba(229,57,53,0.08)'
    border = 'rgba(229,57,53,0.35)'
    ptsColor = '#E53935'
  } else if (isLast) {
    bg = 'rgba(236,64,122,0.08)'
    border = 'rgba(236,64,122,0.35)'
    ptsColor = '#EC407A'
  }

  return (
    <div className="rounded p-2 text-center" style={{ background: bg, border: `1px solid ${border}`, opacity: isElimina ? 0.55 : 1 }}>
      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.30)' }}>F{dateNumber}</p>
      <p style={{ fontSize: '13px', fontWeight: 800, color: ptsColor }}>{date.points}</p>
      <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.28)' }}>
        {isAbsent ? 'AUS' : isWinner ? '1°' : `${date.eliminationPosition}°`}
      </p>
    </div>
  )
}

// ── EVOLUTION CHART ──
interface PositionEvolutionChartProps {
  evolution: Array<{ dateNumber: number; position: number; points: number }>
}

function PositionEvolutionChart({ evolution }: PositionEvolutionChartProps) {
  if (!evolution || evolution.length < 2) return null

  const maxPosition = 24
  const minPosition = 1
  const chartHeight = 110

  const firstPosition = evolution[0].position
  const lastPosition = evolution[evolution.length - 1].position
  const positionChange = firstPosition - lastPosition

  const trendColor = positionChange > 0 ? '#4CAF50' : positionChange < 0 ? '#E53935' : '#FFC107'
  const TrendIcon = positionChange > 0 ? TrendingUp : positionChange < 0 ? TrendingDown : Minus

  const leftPadding = 8
  const rightPadding = 2
  const topPadding = 5
  const bottomPadding = 5
  const yAxisTicks = [1, 6, 12, 18, 24]

  const svgPoints = evolution.map((e, i) => {
    const x = leftPadding + (i / (evolution.length - 1)) * (100 - leftPadding - rightPadding)
    const y = topPadding + ((e.position - minPosition) / (maxPosition - minPosition)) * (100 - topPadding - bottomPadding)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="p-3"
      style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
          <span style={{ fontSize: '12px', color: trendColor, fontWeight: 700 }}>
            {positionChange > 0 ? `+${positionChange}` : positionChange === 0 ? '0' : positionChange}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)' }}>posiciones</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)' }}>F1: #{firstPosition}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.20)' }}>→</span>
          <span style={{ fontSize: '10px', color: '#E53935', fontWeight: 600 }}>Ahora: #{lastPosition}</span>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox="0 0 100 100" className="w-full" style={{ height: chartHeight }} preserveAspectRatio="none">
          {yAxisTicks.map(pos => {
            const y = topPadding + ((pos - minPosition) / (maxPosition - minPosition)) * (100 - topPadding - bottomPadding)
            return (
              <g key={pos}>
                <line x1={leftPadding} y1={y} x2="100" y2={y}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
                <text x={leftPadding - 1} y={y} fill="rgba(255,255,255,0.28)"
                  fontSize="3.5" textAnchor="end" dominantBaseline="middle">#{pos}</text>
              </g>
            )
          })}
          <polyline fill="none" stroke="#E53935" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" points={svgPoints} vectorEffect="non-scaling-stroke" />
          {evolution.map((e, i) => {
            const x = leftPadding + (i / (evolution.length - 1)) * (100 - leftPadding - rightPadding)
            const y = topPadding + ((e.position - minPosition) / (maxPosition - minPosition)) * (100 - topPadding - bottomPadding)
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="1.8" fill="#E53935" stroke="#120008" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                <text x={x} y={y - 3.5} fill="rgba(255,255,255,0.80)"
                  fontSize="3" textAnchor="middle" dominantBaseline="auto">#{e.position}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex justify-between mt-0.5" style={{ paddingLeft: '8%', paddingRight: '2%' }}>
        {evolution.map((e, i) => (
          <span key={i} style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>F{e.dateNumber}</span>
        ))}
      </div>
    </div>
  )
}

export default CPPlayerDetailModal
