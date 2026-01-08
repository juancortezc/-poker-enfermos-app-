'use client'

import { X, Crown, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Image from 'next/image'
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

  // Obtener estadísticas de campeonatos
  const { data: championStats } = useSWR<ChampionStatsResponse>(
    isOpen ? '/api/tournaments/champions-stats' : null,
    (url: string) => fetch(url).then(res => res.json() as Promise<ChampionStatsResponse>)
  )

  // Calcular campeonatos del jugador actual
  const playerChampionships = championStats?.data?.all?.find(
    (champion) => champion.player?.id === playerId
  )

  // Count dates where player participated (not absent) out of completed dates
  const completedDates = details?.datePerformance
    ? details.datePerformance.filter(date => date && date.status === 'completed')
    : []
  const participatedDates = completedDates.filter(date => !date.isAbsent).length
  const totalCompletedDates = completedDates.length
  const totalDates = details?.datePerformance?.length ?? 0

  if (!isOpen) return null

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(26, 26, 26, 0.98) 0%, rgba(18, 18, 18, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !details ? (
          <div className="p-8 text-center">
            <div
              className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
              style={{
                borderColor: 'var(--cp-surface-border)',
                borderTopColor: 'var(--cp-primary)'
              }}
            />
            <p style={{ color: 'var(--cp-on-surface-variant)', fontSize: 'var(--cp-body-size)' }}>
              Cargando...
            </p>
            {error && (
              <p className="mt-2" style={{ color: '#E53935', fontSize: 'var(--cp-caption-size)' }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10"
              style={{ color: 'var(--cp-on-surface-variant)' }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Avatar and Name */}
            <header className="flex items-center gap-4 pr-8">
              {/* Avatar */}
              <div
                className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{
                  width: 72,
                  height: 72,
                  background: details.player.photoUrl ? 'transparent' : 'var(--cp-surface-solid)',
                  border: '2px solid var(--cp-primary)',
                }}
              >
                {details.player.photoUrl ? (
                  <Image
                    src={details.player.photoUrl}
                    alt={details.player.firstName}
                    width={72}
                    height={72}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: '24px',
                      color: 'var(--cp-on-surface-variant)',
                    }}
                  >
                    {getInitials(details.player.firstName, details.player.lastName)}
                  </span>
                )}
              </div>

              {/* Name and Badges */}
              <div className="flex-1 min-w-0">
                <h2
                  className="font-bold truncate"
                  style={{
                    fontSize: 'var(--cp-title-size)',
                    color: 'var(--cp-on-surface)',
                  }}
                >
                  {details.player.firstName} {details.player.lastName}
                </h2>
                {details.player.aliases.length > 0 && (
                  <p
                    className="truncate"
                    style={{
                      fontSize: 'var(--cp-caption-size)',
                      color: 'var(--cp-on-surface-variant)',
                    }}
                  >
                    {details.player.aliases.join(', ')}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <div
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(255, 215, 0, 0.15)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                    }}
                  >
                    <Crown className="w-3 h-3" style={{ color: '#FFD700' }} />
                    <span style={{ fontSize: '10px', color: '#FFD700' }}>
                      {playerChampionships?.championshipsCount || 0}
                    </span>
                  </div>

                  {details.player.lastVictoryDate && (() => {
                    const [day, month, year] = details.player.lastVictoryDate.split('/').map(Number)
                    const victoryDate = new Date(year, month - 1, day)
                    const today = new Date()
                    const daysWithoutVictory = Math.floor(
                      (today.getTime() - victoryDate.getTime()) / (1000 * 3600 * 24)
                    )
                    return (
                      <div
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Target className="w-3 h-3" style={{ color: 'var(--cp-on-surface-variant)' }} />
                        <span style={{ fontSize: '10px', color: 'var(--cp-on-surface-variant)' }}>
                          {daysWithoutVictory}d
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-3 gap-3">
              <StatCard
                label="Posición"
                value={`#${details.currentStats.position}`}
                color="var(--cp-primary)"
              />
              <StatCard
                label="Final"
                value={String(details.currentStats.finalScore ?? details.currentStats.totalPoints)}
                color="var(--cp-on-surface)"
              />
              <StatCard
                label="Total"
                value={String(details.currentStats.totalPoints)}
                color="var(--cp-on-surface-medium)"
              />
            </section>

            {/* Additional Stats */}
            <section className="grid grid-cols-2 gap-3">
              <StatCard
                label="Mejor resultado"
                value={details.bestResult}
                color="#4CAF50"
                small
              />
              <StatCard
                label="Fechas jugadas"
                value={`${participatedDates}/${totalCompletedDates}`}
                color="var(--cp-on-surface-variant)"
                small
              />
            </section>

            {/* Position Evolution Chart */}
            {details.rankingEvolution && details.rankingEvolution.length > 1 && (
              <section>
                <h3
                  className="mb-3"
                  style={{
                    fontSize: 'var(--cp-caption-size)',
                    color: 'var(--cp-on-surface-variant)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Evolución de posición
                </h3>
                <PositionEvolutionChart evolution={details.rankingEvolution} />
              </section>
            )}

            {/* Date Performance */}
            <section>
              <h3
                className="mb-3"
                style={{
                  fontSize: 'var(--cp-caption-size)',
                  color: 'var(--cp-on-surface-variant)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Resultados por fecha
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: Math.max(totalDates, 12) }, (_, i) => {
                  const dateNumber = i + 1
                  const date = details.datePerformance.find(d => d.dateNumber === dateNumber)

                  return (
                    <DateCard
                      key={dateNumber}
                      dateNumber={dateNumber}
                      date={date}
                      isElimina={
                        date?.points === details.currentStats.elimina1 ||
                        date?.points === details.currentStats.elimina2
                      }
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

// ============================================
// STAT CARD COMPONENT
// ============================================
interface StatCardProps {
  label: string
  value: string
  color: string
  small?: boolean
}

function StatCard({ label, value, color, small }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <p
        style={{
          fontSize: '9px',
          color: 'var(--cp-on-surface-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </p>
      <p
        className="font-bold mt-1"
        style={{
          fontSize: small ? '14px' : '20px',
          color,
        }}
      >
        {value}
      </p>
    </div>
  )
}

// ============================================
// DATE CARD COMPONENT
// ============================================
interface DateCardProps {
  dateNumber: number
  date?: {
    status: string
    points: number
    isAbsent?: boolean
    eliminationPosition?: number
    eliminatedBy?: {
      name?: string
      alias?: string
      isGuest?: boolean
    }
  }
  isElimina: boolean
}

function DateCard({ dateNumber, date, isElimina }: DateCardProps) {
  // Pending date
  if (!date || date.status === 'pending' || date.status === 'CREATED') {
    return (
      <div
        className="rounded-lg p-2 text-center opacity-40"
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        <p style={{ fontSize: '9px', color: 'var(--cp-on-surface-muted)' }}>F{dateNumber}</p>
        <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>-</p>
      </div>
    )
  }

  // Live date
  if (date.status === 'in_progress') {
    return (
      <div
        className="rounded-lg p-2 text-center"
        style={{
          background: 'rgba(var(--cp-primary-rgb), 0.2)',
          border: '1px solid var(--cp-primary)',
        }}
      >
        <p style={{ fontSize: '9px', color: 'var(--cp-primary)' }}>F{dateNumber}</p>
        <p className="font-bold" style={{ fontSize: '12px', color: 'var(--cp-primary)' }}>
          {date.points}
        </p>
        <p style={{ fontSize: '8px', color: 'var(--cp-primary)' }}>VIVO</p>
      </div>
    )
  }

  // Completed date
  const isWinner = !date.eliminationPosition
  const isAbsent = date.isAbsent
  const isLast = date.eliminationPosition && date.points <= 1

  let bgColor = 'rgba(0, 0, 0, 0.3)'
  let borderColor = '#8B0000' // Rojo sangre for normal played dates
  let pointsColor = 'var(--cp-on-surface)'

  if (isElimina) {
    bgColor = 'rgba(255, 255, 255, 0.03)'
    borderColor = 'rgba(255, 255, 255, 0.15)'
    pointsColor = 'var(--cp-on-surface-muted)'
  } else if (isWinner) {
    bgColor = 'rgba(255, 215, 0, 0.1)'
    borderColor = '#FFD700' // Gold for winner
    pointsColor = '#FFD700'
  } else if (isAbsent) {
    bgColor = 'rgba(229, 57, 53, 0.1)'
    borderColor = '#E53935' // Red for absent
    pointsColor = '#E53935'
  } else if (isLast) {
    bgColor = 'rgba(236, 64, 122, 0.1)'
    borderColor = '#EC407A' // Pink for last place
    pointsColor = '#EC407A'
  }

  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        opacity: isElimina ? 0.5 : 1,
      }}
    >
      <p style={{ fontSize: '9px', color: 'var(--cp-on-surface-muted)' }}>F{dateNumber}</p>
      <p className="font-bold" style={{ fontSize: '12px', color: pointsColor }}>
        {date.points}
      </p>
      <p style={{ fontSize: '8px', color: 'var(--cp-on-surface-muted)' }}>
        {isAbsent ? 'AUS' : isWinner ? '1°' : `${date.eliminationPosition}°`}
      </p>
    </div>
  )
}

// ============================================
// POSITION EVOLUTION CHART COMPONENT
// ============================================
interface PositionEvolutionChartProps {
  evolution: Array<{
    dateNumber: number
    position: number
    points: number
  }>
}

function PositionEvolutionChart({ evolution }: PositionEvolutionChartProps) {
  if (!evolution || evolution.length < 2) return null

  const maxPosition = Math.max(...evolution.map(e => e.position), 15)
  const minPosition = 1
  const chartHeight = 80
  const chartWidth = evolution.length * 40

  // Calculate position change
  const firstPosition = evolution[0].position
  const lastPosition = evolution[evolution.length - 1].position
  const positionChange = firstPosition - lastPosition // Positive means improved

  const getTrendIcon = () => {
    if (positionChange > 0) return <TrendingUp className="w-4 h-4" style={{ color: '#4CAF50' }} />
    if (positionChange < 0) return <TrendingDown className="w-4 h-4" style={{ color: '#E53935' }} />
    return <Minus className="w-4 h-4" style={{ color: '#FFC107' }} />
  }

  const getTrendColor = () => {
    if (positionChange > 0) return '#4CAF50'
    if (positionChange < 0) return '#E53935'
    return '#FFC107'
  }

  // Create SVG path for the line
  const points = evolution.map((e, i) => {
    const x = (i / (evolution.length - 1)) * 100
    // Invert Y because lower position number = better = higher on chart
    const y = ((e.position - minPosition) / (maxPosition - minPosition)) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Header with trend */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span
            style={{
              fontSize: '12px',
              color: getTrendColor(),
              fontWeight: 600,
            }}
          >
            {positionChange > 0 ? `+${positionChange}` : positionChange === 0 ? '0' : positionChange}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--cp-on-surface-muted)',
            }}
          >
            posiciones
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>
            F1: #{firstPosition}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--cp-on-surface-variant)' }}>
            →
          </span>
          <span style={{ fontSize: '10px', color: 'var(--cp-primary)' }}>
            Ahora: #{lastPosition}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 100 100`}
          className="w-full"
          style={{ height: chartHeight, minWidth: chartWidth }}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[1, 5, 10, 15].filter(p => p <= maxPosition).map(pos => {
            const y = ((pos - minPosition) / (maxPosition - minPosition)) * 100
            return (
              <g key={pos}>
                <line
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                />
                <text
                  x="-2"
                  y={y}
                  fill="var(--cp-on-surface-muted)"
                  fontSize="3"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  #{pos}
                </text>
              </g>
            )
          })}

          {/* Line chart */}
          <polyline
            fill="none"
            stroke="var(--cp-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {evolution.map((e, i) => {
            const x = (i / (evolution.length - 1)) * 100
            const y = ((e.position - minPosition) / (maxPosition - minPosition)) * 100
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill="var(--cp-primary)"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-2">
        {evolution.map((e, i) => (
          <span
            key={i}
            style={{
              fontSize: '8px',
              color: 'var(--cp-on-surface-muted)',
            }}
          >
            F{e.dateNumber}
          </span>
        ))}
      </div>
    </div>
  )
}

export default CPPlayerDetailModal
