'use client'

import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Image from 'next/image'
import { useMemo } from 'react'
import { usePlayerTournamentDetails } from '@/hooks/usePlayerTournamentDetails'
import useSWR from 'swr'

interface ChampionPlayer {
  id: string; firstName: string; lastName: string; photoUrl?: string | null; isActive: boolean; aliases: string[]
}
interface ChampionData {
  player: ChampionPlayer | null; championshipsCount: number; tournamentNumbers: number[]
}
interface ChampionStatsResponse {
  success: boolean
  data?: { all: ChampionData[]; top3: ChampionData[]; others: ChampionData[]; totalChampions: number; totalChampionships: number }
  error?: string
}

interface CPPlayerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  playerId: string
  tournamentId: number
}

interface Multa {
  id: number
  reason: string
  pointsPenalty: number
  chipsAmount: number | null
  moneyAmount: number | null
  paid: boolean
}

export function CPPlayerDetailModal({ isOpen, onClose, playerId, tournamentId }: CPPlayerDetailModalProps) {
  const { details, loading, error } = usePlayerTournamentDetails(
    isOpen ? playerId : '',
    isOpen ? tournamentId : 0
  )

  const { data: championStats } = useSWR<ChampionStatsResponse>(
    isOpen ? '/api/tournaments/champions-stats' : null,
    (url: string) => fetch(url).then(res => res.json() as Promise<ChampionStatsResponse>),
    { revalidateOnFocus: false }
  )

  const playerChampionships = championStats?.data?.all?.find(c => c.player?.id === playerId)

  const { data: multas } = useSWR<Multa[]>(
    isOpen && playerId && tournamentId ? `/api/multas?tournamentId=${tournamentId}&playerId=${playerId}` : null,
    (url: string) => fetch(url).then(res => res.json() as Promise<Multa[]>),
    { revalidateOnFocus: false }
  )

  const completedDates = details?.datePerformance?.filter(d => d.status === 'completed') ?? []
  const participatedDates = completedDates.filter(d => !d.isAbsent).length
  const totalCompletedDates = completedDates.length
  const totalDates = details?.datePerformance?.length ?? 0

  // Eliminated dates by rank (not by value)
  const eliminatedDateNumbers = useMemo(() => {
    if (!details || !details.currentStats.eliminasActive) return new Set<number>()
    const n = details.datesToEliminate
    if (n <= 0) return new Set<number>()
    const played = details.datePerformance.filter(d => d.status === 'completed' && !d.isAbsent && d.points > 0)
    const sorted = [...played].sort((a, b) => a.points !== b.points ? a.points - b.points : b.dateNumber - a.dateNumber)
    return new Set(sorted.slice(0, n).map(d => d.dateNumber))
  }, [details])

  // Achievement data
  const achievements = useMemo(() => {
    if (!details) return null

    const played = details.datePerformance.filter(d => d.status === 'completed' && !d.isAbsent)

    // Podiums: dates where player won or finished in top 3
    const podiums = played.filter(d =>
      d.eliminationPosition === undefined || (d.eliminationPosition !== undefined && d.eliminationPosition <= 3)
    ).length

    // Best score + which date
    let bestScore = 0, bestScoreDate = 0
    for (const d of played) {
      if (d.points > bestScore) { bestScore = d.points; bestScoreDate = d.dateNumber }
    }

    // Mesa final streak: consecutive dates reaching the final table
    // Mesa final = winner (no eliminationPosition) OR survived 12+ other eliminations
    const MESA_FINAL_MIN = 12
    const isMesaFinal = (d: typeof played[0]) =>
      d.eliminationPosition === undefined || (d.eliminationPosition !== undefined && d.eliminationPosition >= MESA_FINAL_MIN)

    const sortedCompleted = [...details.datePerformance]
      .filter(d => d.status === 'completed')
      .sort((a, b) => a.dateNumber - b.dateNumber)
    let maxMesaStreak = 0, curMesaStreak = 0
    for (const d of sortedCompleted) {
      if (!d.isAbsent && isMesaFinal(d)) { curMesaStreak++; maxMesaStreak = Math.max(maxMesaStreak, curMesaStreak) }
      else { curMesaStreak = 0 }
    }

    // Best single-date ranking rise (sort evolution ascending first to ensure correct order)
    const sortedEvo = [...details.rankingEvolution].sort((a, b) => a.dateNumber - b.dateNumber)
    let bestRise = 0
    for (let i = 1; i < sortedEvo.length; i++) {
      const rise = sortedEvo[i - 1].position - sortedEvo[i].position
      if (rise > bestRise) bestRise = rise
    }

    return { podiums, bestScore, bestScoreDate, mesaFinalStreak: maxMesaStreak, bestRise }
  }, [details])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto"
        style={{
          borderRadius: '10px 10px 0 0',
          background: '#060914',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.018) 39px, rgba(255,255,255,0.018) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.018) 39px, rgba(255,255,255,0.018) 40px)
          `,
          border: '1px solid rgba(0,229,255,0.18)',
          borderBottom: 'none',
          boxShadow: '0 -12px 60px rgba(0,0,0,0.90), 0 0 80px rgba(0,180,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: '36px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.10)' }}>
          <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.40)' }} />
        </button>

        {loading || !details ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: 'rgba(0,229,255,0.15)', borderTopColor: '#00E5FF' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', letterSpacing: '0.08em' }}>CARGANDO...</p>
            {error && <p className="mt-2" style={{ color: '#ff4444', fontSize: '11px' }}>{error}</p>}
          </div>
        ) : (
          <div className="px-4 pb-8 space-y-4 pt-1">

            {/* ── PLAYER BANNER ── */}
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: '5px',
                minHeight: '140px',
                background: 'linear-gradient(135deg, #0d1528 0%, #131e38 60%, #0a1020 100%)',
                border: '1px solid rgba(0,229,255,0.22)',
                boxShadow: '0 0 40px rgba(0,180,255,0.10)',
              }}
            >
              {/* Cyan glow top-left */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '120px', height: '80px', background: 'radial-gradient(ellipse at 0% 0%, rgba(0,229,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

              {/* Photo right */}
              {details.player.photoUrl && (
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '130px', pointerEvents: 'none' }}>
                  <Image src={details.player.photoUrl} alt={details.player.firstName} fill className="object-cover object-top" unoptimized />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0d1528 0%, rgba(13,21,40,0.6) 45%, transparent 100%)' }} />
                </div>
              )}

              <div style={{ padding: '14px 16px', position: 'relative', zIndex: 1, maxWidth: details.player.photoUrl ? '65%' : '100%' }}>
                {/* Position badge */}
                <div className="inline-flex items-center gap-1.5 mb-2"
                  style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.35)', borderRadius: '5px', padding: '2px 8px' }}>
                  <span style={{ fontSize: '9px', color: '#00E5FF', fontWeight: 800, letterSpacing: '0.14em' }}>RANK</span>
                  <span style={{ fontSize: '14px', color: '#00E5FF', fontWeight: 900 }}>#{details.currentStats.position}</span>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                  {details.player.firstName}<br />
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{details.player.lastName}</span>
                </h2>
                {details.player.aliases.length > 0 && (
                  <p style={{ fontSize: '10px', color: 'rgba(0,229,255,0.65)', marginTop: '3px', letterSpacing: '0.05em' }}>
                    &ldquo;{details.player.aliases[0]}&rdquo;
                  </p>
                )}

                {/* Championships badge */}
                {(playerChampionships?.championshipsCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span style={{ fontSize: '12px' }}>🏆</span>
                    <span style={{ fontSize: '9px', color: '#FFD700', fontWeight: 700 }}>
                      {playerChampionships!.championshipsCount}× campeón
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom stats bar */}
              <div className="flex border-t" style={{ borderColor: 'rgba(0,229,255,0.12)' }}>
                {[
                  { label: 'FINAL', val: details.currentStats.finalScore ?? details.currentStats.totalPoints, color: '#fff' },
                  { label: 'TOTAL', val: details.currentStats.totalPoints, color: 'rgba(255,255,255,0.45)' },
                  { label: 'FECHAS', val: `${participatedDates}/${totalCompletedDates}`, color: 'rgba(255,255,255,0.55)' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex-1 text-center py-2" style={{ borderRight: '1px solid rgba(0,229,255,0.10)' }}>
                    <p style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: '1px' }}>{label}</p>
                    <p style={{ fontSize: '15px', fontWeight: 800, color }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── LOGROS ── */}
            {achievements && (
              <section>
                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.16em', marginBottom: '8px', fontWeight: 700 }}>
                  LOGROS
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <AchievementBadge
                    emoji="🏆"
                    label="Podios"
                    value={achievements.podiums}
                    suffix={achievements.podiums === 1 ? 'podio' : 'podios'}
                    color="#FFD700"
                    glow="rgba(255,215,0,0.20)"
                    border="rgba(255,215,0,0.30)"
                    unlocked={achievements.podiums > 0}
                  />
                  <AchievementBadge
                    emoji="🔥"
                    label="Racha mesas finales"
                    value={achievements.mesaFinalStreak}
                    suffix={achievements.mesaFinalStreak === 1 ? 'fecha seguida' : 'fechas seguidas'}
                    color="#FF6B35"
                    glow="rgba(255,107,53,0.18)"
                    border="rgba(255,107,53,0.32)"
                    unlocked={achievements.mesaFinalStreak >= 1}
                  />
                  <AchievementBadge
                    emoji="⚡"
                    label="Mejor subida"
                    value={achievements.bestRise > 0 ? `+${achievements.bestRise}` : '—'}
                    suffix={achievements.bestRise > 0 ? 'posiciones de golpe' : ''}
                    color="#FAFF00"
                    glow="rgba(250,255,0,0.14)"
                    border="rgba(250,255,0,0.28)"
                    unlocked={achievements.bestRise > 0}
                  />
                  <AchievementBadge
                    emoji="🎯"
                    label="Mejor score"
                    value={achievements.bestScore}
                    suffix={achievements.bestScoreDate > 0 ? `pts · F${achievements.bestScoreDate}` : 'pts'}
                    color="#00FF88"
                    glow="rgba(0,255,136,0.14)"
                    border="rgba(0,255,136,0.28)"
                    unlocked={achievements.bestScore > 0}
                  />
                </div>
              </section>
            )}

            {/* ── EVOLUCIÓN ── */}
            {details.rankingEvolution && details.rankingEvolution.length > 1 && (
              <section>
                <SectionLabel>Evolución de posición</SectionLabel>
                <EvolutionCards evolution={details.rankingEvolution} />
              </section>
            )}

            {/* ── HISTORIAL DE FECHAS ── */}
            <section>
              <SectionLabel>Historial</SectionLabel>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: Math.max(totalDates, 12) }, (_, i) => {
                  const dateNumber = i + 1
                  const date = details.datePerformance.find(d => d.dateNumber === dateNumber)
                  return (
                    <DateCard key={dateNumber} dateNumber={dateNumber} date={date} isElimina={eliminatedDateNumbers.has(dateNumber)} />
                  )
                })}
              </div>
            </section>

            {/* ── MULTAS ── */}
            {multas && multas.length > 0 && (
              <section>
                <SectionLabel>Multas</SectionLabel>
                <div className="space-y-1.5">
                  {multas.map((multa) => (
                    <div
                      key={multa.id}
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderRadius: '5px', background: 'rgba(229,57,53,0.10)', border: '1px solid rgba(229,57,53,0.22)' }}
                    >
                      <div className="min-w-0">
                        <p style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>{multa.reason}</p>
                        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)' }}>
                          {multa.pointsPenalty > 0 && `-${multa.pointsPenalty} pts`}
                          {!!multa.chipsAmount && `${multa.pointsPenalty > 0 ? ' · ' : ''}${multa.chipsAmount} fichas`}
                          {!!multa.moneyAmount && `${multa.pointsPenalty > 0 || multa.chipsAmount ? ' · ' : ''}$${multa.moneyAmount}`}
                        </p>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: multa.paid ? '#16a34a' : '#E53935', flexShrink: 0 }}>
                        {multa.paid ? 'PAGADA' : 'PENDIENTE'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ACHIEVEMENT BADGE ──
interface AchievementBadgeProps {
  emoji: string
  label: string
  value: string | number
  suffix: string
  color: string
  glow: string
  border: string
  unlocked: boolean
}

function AchievementBadge({ emoji, label, value, suffix, color, glow, border, unlocked }: AchievementBadgeProps) {
  return (
    <div
      style={{
        borderRadius: '5px',
        padding: '10px 12px',
        background: unlocked ? `rgba(10,14,30,0.95)` : 'rgba(10,14,30,0.60)',
        border: `1px solid ${unlocked ? border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: unlocked ? `0 0 20px ${glow}, inset 0 1px 0 ${border}` : 'none',
        opacity: unlocked ? 1 : 0.45,
        transition: 'all 0.2s',
      }}
    >
      <div className="flex items-start gap-2">
        <span style={{ fontSize: '22px', lineHeight: 1, filter: unlocked ? 'none' : 'grayscale(1)' }}>{emoji}</span>
        <div className="min-w-0">
          <p style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '2px' }}>
            {label}
          </p>
          <p style={{ fontSize: '20px', fontWeight: 900, color: unlocked ? color : 'rgba(255,255,255,0.25)', lineHeight: 1 }}>
            {value}
          </p>
          {suffix && (
            <p style={{ fontSize: '8px', color: unlocked ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.20)', marginTop: '1px' }}>
              {suffix}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SECTION LABEL ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div style={{ width: '3px', height: '10px', borderRadius: '2px', background: '#00E5FF', flexShrink: 0 }} />
      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
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
      <div className="p-2 text-center opacity-25" style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.30)' }}>F{dateNumber}</p>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>—</p>
      </div>
    )
  }

  if (date.status === 'in_progress') {
    return (
      <div className="p-2 text-center" style={{ borderRadius: '5px', background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.40)', boxShadow: '0 0 12px rgba(0,229,255,0.15)' }}>
        <p style={{ fontSize: '9px', color: '#00E5FF' }}>F{dateNumber}</p>
        <p style={{ fontSize: '12px', fontWeight: 800, color: '#00E5FF' }}>{date.points}</p>
        <p style={{ fontSize: '7px', color: '#00E5FF' }}>LIVE</p>
      </div>
    )
  }

  const isWinner = !date.eliminationPosition
  const isAbsent = date.isAbsent
  const isLast = date.eliminationPosition && date.points <= 1

  let bg = 'rgba(255,255,255,0.04)'
  let border = 'rgba(255,255,255,0.08)'
  let ptsColor = 'rgba(255,255,255,0.65)'
  let glow = ''

  if (isElimina) {
    bg = 'rgba(255,255,255,0.02)'; border = 'rgba(255,255,255,0.04)'; ptsColor = 'rgba(255,255,255,0.20)'
  } else if (isWinner) {
    bg = 'rgba(255,215,0,0.08)'; border = 'rgba(255,215,0,0.40)'; ptsColor = '#FFD700'; glow = '0 0 10px rgba(255,215,0,0.18)'
  } else if (isAbsent) {
    bg = 'rgba(255,50,50,0.06)'; border = 'rgba(255,50,50,0.28)'; ptsColor = '#ff6666'
  } else if (isLast) {
    bg = 'rgba(200,50,200,0.06)'; border = 'rgba(200,50,200,0.28)'; ptsColor = '#cc66ff'
  }

  return (
    <div className="p-2 text-center" style={{ borderRadius: '5px', background: bg, border: `1px solid ${border}`, boxShadow: glow || 'none', opacity: isElimina ? 0.45 : 1 }}>
      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>F{dateNumber}</p>
      <p style={{ fontSize: '13px', fontWeight: 800, color: ptsColor }}>{date.points}</p>
      <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)' }}>
        {isAbsent ? 'AUS' : isWinner ? '1°' : `${date.eliminationPosition}°`}
      </p>
    </div>
  )
}

// ── EVOLUTION CARDS ── (replaces line chart — horizontal scrollable cards per date)
function EvolutionCards({ evolution }: { evolution: Array<{ dateNumber: number; position: number; points: number }> }) {
  if (!evolution || evolution.length < 2) return null

  const sorted = [...evolution].sort((a, b) => a.dateNumber - b.dateNumber)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const netChange = first.position - last.position

  return (
    <div>
      {/* Net summary */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)' }}>F{first.dateNumber}: #{first.position}</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>→</span>
        <span style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 700 }}>F{last.dateNumber}: #{last.position}</span>
        <span style={{
          fontSize: '10px', fontWeight: 800,
          color: netChange > 0 ? '#00FF88' : netChange < 0 ? '#ff4444' : '#888',
          marginLeft: 'auto',
        }}>
          {netChange > 0 ? `▲${netChange}` : netChange < 0 ? `▼${Math.abs(netChange)}` : '●'} neto
        </span>
      </div>

      {/* Scrollable cards */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {sorted.map((e, i) => {
          const prev = sorted[i - 1]
          const change = prev ? prev.position - e.position : 0

          // Color tier by position
          const isWinner = e.position === 1
          const isTop3 = e.position <= 3
          const isTop8 = e.position <= 8

          const bg = isWinner
            ? 'linear-gradient(160deg, rgba(255,215,0,0.20) 0%, rgba(255,185,0,0.08) 100%)'
            : isTop3 ? 'rgba(255,215,0,0.08)'
            : isTop8 ? 'rgba(0,229,255,0.07)'
            : 'rgba(255,255,255,0.03)'
          const border = isWinner ? 'rgba(255,215,0,0.55)'
            : isTop3 ? 'rgba(255,215,0,0.28)'
            : isTop8 ? 'rgba(0,229,255,0.22)'
            : 'rgba(255,255,255,0.07)'
          const posColor = isWinner ? '#FFD700'
            : isTop3 ? '#FFD700'
            : isTop8 ? '#00E5FF'
            : 'rgba(255,255,255,0.60)'
          const changeColor = change > 0 ? '#00FF88' : change < 0 ? '#ff5555' : 'rgba(255,255,255,0.25)'

          return (
            <div
              key={e.dateNumber}
              className="shrink-0 flex flex-col items-center"
              style={{
                width: '50px', padding: '8px 4px 7px',
                borderRadius: '5px', background: bg, border: `1px solid ${border}`,
                boxShadow: isWinner ? '0 0 14px rgba(255,215,0,0.18)' : isTop3 ? '0 0 8px rgba(255,215,0,0.10)' : 'none',
              }}
            >
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em', marginBottom: '3px' }}>
                F{e.dateNumber}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: posColor, lineHeight: 1 }}>
                #{e.position}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: changeColor, marginTop: '3px' }}>
                {i === 0 ? '—' : change > 0 ? `▲${change}` : change < 0 ? `▼${Math.abs(change)}` : '●'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CPPlayerDetailModal
