'use client'

import useSWR from 'swr'
import Image from 'next/image'
import { useMemo } from 'react'
import { useGameDates } from '@/hooks/useGameDates'

interface PlayerWithVictoryData {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  lastVictoryDate?: string | null
  daysWithoutVictory: number
  hasNeverWon: boolean
}

interface DaysWithoutVictoryResponse {
  tournament: { id: number; number: number; name: string }
  players: PlayerWithVictoryData[]
  stats: {
    totalPlayers: number
    playersWithVictories: number
    playersNeverWon: number
    averageDaysWithoutVictory: number
    longestStreak: number
  }
}

interface MatchingGameDate {
  dateNumber: number
  scheduledDate: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error('Error fetching data')
  return res.json()
}

// ── DATE UTILS ──

function parseDateStr(dateStr: string): Date | null {
  if (!dateStr) return null
  // YYYY-MM-DD
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  // DD/MM/YYYY
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/').map(Number)
    return new Date(y, m - 1, d)
  }
  return null
}

function toLocalYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatDateEs(date: Date): string {
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`
}

function getMilestoneDate(lastVictoryDate: string | null | undefined): Date | null {
  if (!lastVictoryDate) return null
  const base = parseDateStr(lastVictoryDate)
  if (!base) return null
  const m = new Date(base)
  m.setDate(m.getDate() + 1000)
  return m
}

// ── MILESTONE TIERS (ordered highest → lowest) ──
const TIERS = [
  { key: 'club',    min: 1000, emoji: '💀', label: 'CLUB 1000',    color: '#FF0040', border: 'rgba(255,0,64,0.45)',    glow: 'rgba(255,0,64,0.30)'    },
  { key: 'danger',  min: 900,  emoji: '☠️', label: 'ZONA CRÍTICA', color: '#FF2255', border: 'rgba(255,34,85,0.40)',   glow: 'rgba(255,34,85,0.25)'   },
  { key: '2years',  min: 730,  emoji: '🔴', label: '+ 2 AÑOS',     color: '#FF6020', border: 'rgba(255,96,32,0.38)',   glow: 'rgba(255,96,32,0.22)'   },
  { key: '1year',   min: 365,  emoji: '🟠', label: '+ 1 AÑO',      color: '#FF8C35', border: 'rgba(255,140,53,0.35)',  glow: 'rgba(255,140,53,0.18)'  },
  { key: '6months', min: 180,  emoji: '🟡', label: '+ 6 MESES',    color: '#FAFF00', border: 'rgba(250,255,0,0.30)',   glow: 'rgba(250,255,0,0.16)'   },
  { key: 'recent',  min: 0,    emoji: '🟢', label: 'RECIENTES',    color: '#00FF88', border: 'rgba(0,255,136,0.30)',   glow: 'rgba(0,255,136,0.16)'   },
]

function getTier(days: number) {
  return TIERS.find(t => days >= t.min) ?? TIERS[TIERS.length - 1]
}

const SCANLINES = `
  repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 39px, rgba(255,255,255,0.015) 40px),
  repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.015) 39px, rgba(255,255,255,0.015) 40px)
`

// ── XP BAR ──
function XPBar({ days, color, glow, height = 4 }: { days: number; color: string; glow: string; height?: number }) {
  const pct = Math.min(100, (days / 1000) * 100)
  const isCritical = pct >= 90
  return (
    <div style={{ height, borderRadius: '3px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: isCritical ? `linear-gradient(90deg, ${color} 0%, #fff 100%)` : color,
        boxShadow: `0 0 8px ${glow}`, borderRadius: '3px', position: 'relative',
      }}>
        {isCritical && (
          <div style={{
            position: 'absolute', right: 0, top: '-1px', bottom: '-1px', width: '4px',
            background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.9)', borderRadius: '2px',
          }} />
        )}
      </div>
    </div>
  )
}

// ── GAME DATE BADGE ──
function GameDateBadge({ match }: { match: MatchingGameDate }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '5px', marginTop: '5px',
      background: 'rgba(0,229,255,0.12)',
      border: '1px solid rgba(0,229,255,0.45)',
      boxShadow: '0 0 12px rgba(0,229,255,0.20)',
    }}>
      <span style={{ fontSize: '11px' }}>🎮</span>
      <span style={{ fontSize: '9px', fontWeight: 800, color: '#00E5FF', letterSpacing: '0.10em' }}>
        COINCIDE CON F{match.dateNumber}
      </span>
    </div>
  )
}

// ── STATS STRIP ──
function StatsStrip({ players }: { players: PlayerWithVictoryData[] }) {
  const tierCounts = TIERS.map((tier, i) => {
    const upper = i > 0 ? TIERS[i - 1].min : Infinity
    const count = players.filter(p => p.daysWithoutVictory >= tier.min && p.daysWithoutVictory < upper).length
    return { tier, count }
  }).filter(t => t.count > 0)

  const withDays = players.filter(p => p.daysWithoutVictory > 0 && p.daysWithoutVictory < 999999)
  const avg = withDays.length > 0
    ? Math.round(withDays.reduce((s, p) => s + p.daysWithoutVictory, 0) / withDays.length)
    : 0
  const total = players.length

  const cardBase: React.CSSProperties = {
    padding: '8px 10px', borderRadius: '5px',
    background: 'rgba(255,255,255,0.03)',
    display: 'flex', flexDirection: 'column', gap: '2px',
  }

  return (
    <div style={{
      borderRadius: '5px', padding: '10px',
      background: 'rgba(6,9,20,0.88)', backgroundImage: SCANLINES,
      border: '1px solid rgba(0,229,255,0.14)',
    }}>
      <div className="grid grid-cols-3 gap-2">
        {/* Tier count cards */}
        {tierCounts.map(({ tier, count }) => {
          const pct = Math.round((count / total) * 100)
          return (
            <div key={tier.key} style={{ ...cardBase, border: `1px solid ${tier.border}` }}>
              <p style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>
                {tier.label}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 900, color: '#fff', lineHeight: 1, textAlign: 'right' }}>
                {count}
              </p>
              <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.32)', textAlign: 'right' }}>
                {pct}% del total
              </p>
            </div>
          )
        })}

        {/* Average card */}
        <div style={{ ...cardBase, border: '1px solid rgba(0,229,255,0.22)' }}>
          <p style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>
            PROMEDIO
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{avg}</span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>d</span>
          </div>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.32)', textAlign: 'right' }}>
            días sin ganar
          </p>
        </div>

        {/* Historical record card — placeholder, data not yet in DB */}
        <div style={{ ...cardBase, border: '1px solid rgba(255,255,255,0.08)', opacity: 0.55 }}>
          <p style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>
            RÉCORD HISTÓRICO
          </p>
          <p style={{ fontSize: '24px', fontWeight: 900, color: 'rgba(255,255,255,0.30)', lineHeight: 1, textAlign: 'right', marginTop: 'auto' }}>
            —
          </p>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.22)', textAlign: 'right' }}>
            días sin ganar
          </p>
        </div>
      </div>
    </div>
  )
}

// ── CLUB 1000 COUNTDOWN HERO ──
function Club1000Hero({ player, milestoneDate, matchingGameDate }: {
  player: PlayerWithVictoryData
  milestoneDate: Date | null
  matchingGameDate: MatchingGameDate | null
}) {
  const days = player.daysWithoutVictory
  const isPast = days >= 1000
  const remaining = 1000 - days
  const pct = Math.min(100, Math.round((days / 1000) * 100))
  const tier = getTier(days)

  return (
    <div style={{
      borderRadius: '5px', padding: '16px',
      background: '#060914', backgroundImage: SCANLINES,
      border: `1px solid ${tier.border}`,
      boxShadow: `0 0 32px ${tier.glow}, inset 0 1px 0 ${tier.border}`,
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '8px', fontWeight: 800, color: tier.color, letterSpacing: '0.22em', marginBottom: '4px' }}>
            {isPast ? '💀 MIEMBRO DEL CLUB 1000' : '⚠️ MÁS CERCA DEL HITO'}
          </p>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: '40px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {days}
            </span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>días</span>
          </div>

          {!isPast && (
            <p style={{ fontSize: '12px', fontWeight: 700, color: tier.color, marginTop: '3px' }}>
              Faltan {remaining} días
            </p>
          )}

          {/* Milestone date */}
          {milestoneDate && (
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>
              📅 {isPast ? 'Cumplió el' : 'Se cumple el'}{' '}
              <span style={{ fontWeight: 700, color: tier.color }}>{formatDateEs(milestoneDate)}</span>
            </p>
          )}

          {/* Game date match */}
          {matchingGameDate && <GameDateBadge match={matchingGameDate} />}

          {!player.hasNeverWon && player.lastVictoryDate && (
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: '5px' }}>
              Última victoria: {player.lastVictoryDate}
            </p>
          )}
          {player.hasNeverWon && (
            <p style={{ fontSize: '9px', fontWeight: 800, color: tier.color, marginTop: '5px', letterSpacing: '0.08em' }}>
              NUNCA HA GANADO
            </p>
          )}
        </div>

        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{
            width: 58, height: 58, borderRadius: '5px', overflow: 'hidden',
            border: `2px solid ${tier.border}`, boxShadow: `0 0 20px ${tier.glow}`,
          }}>
            {player.photoUrl ? (
              <Image src={player.photoUrl} alt={player.firstName} width={58} height={58} className="object-cover w-full h-full" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,0,64,0.10)' }}>
                <span style={{ fontSize: '17px', fontWeight: 900, color: tier.color }}>
                  {player.firstName[0]}{player.lastName[0]}
                </span>
              </div>
            )}
          </div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#fff', marginTop: '5px' }}>{player.firstName}</p>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>{player.lastName}</p>
        </div>
      </div>

      <div className="mt-3">
        <XPBar days={days} color={tier.color} glow={tier.glow} height={8} />
        <div className="flex justify-between mt-1.5">
          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)' }}>0</span>
          <span style={{ fontSize: '8px', fontWeight: 800, color: tier.color }}>{pct}%</span>
          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)' }}>1000</span>
        </div>
      </div>
    </div>
  )
}

// ── MILESTONE SECTION HEADER ──
function TierHeader({ tier, count }: { tier: typeof TIERS[0]; count: number }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <div style={{ height: '1px', flex: 1, background: `linear-gradient(90deg, transparent, ${tier.border})` }} />
      <div style={{
        padding: '4px 12px', borderRadius: '5px',
        background: 'rgba(6,9,20,0.96)', border: `1px solid ${tier.border}`,
        boxShadow: `0 0 14px ${tier.glow}`,
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span style={{ fontSize: '13px' }}>{tier.emoji}</span>
        <span style={{ fontSize: '9px', fontWeight: 800, color: tier.color, letterSpacing: '0.18em' }}>{tier.label}</span>
        <span style={{
          fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.30)',
          borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '6px',
        }}>×{count}</span>
      </div>
      <div style={{ height: '1px', flex: 1, background: `linear-gradient(90deg, ${tier.border}, transparent)` }} />
    </div>
  )
}

// ── PLAYER ROW ──
function PlayerRow({ player, rank, milestoneDate, matchingGameDate }: {
  player: PlayerWithVictoryData
  rank: number
  milestoneDate: Date | null
  matchingGameDate: MatchingGameDate | null
}) {
  const days = player.daysWithoutVictory
  const tier = getTier(days)
  const isPast = days >= 1000

  return (
    <div style={{
      padding: '9px 10px', borderRadius: '5px', marginBottom: '3px',
      background: matchingGameDate ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.025)',
      border: matchingGameDate ? '1px solid rgba(0,229,255,0.28)' : '1px solid rgba(255,255,255,0.05)',
      boxShadow: matchingGameDate ? '0 0 14px rgba(0,229,255,0.10)' : 'none',
    }}>
      <div className="flex items-center gap-2.5">
        {/* Rank */}
        <span style={{ width: '18px', textAlign: 'center', flexShrink: 0, fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.22)' }}>
          {rank}
        </span>

        {/* Photo */}
        <div style={{
          width: 36, height: 36, flexShrink: 0, borderRadius: '5px', overflow: 'hidden',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {player.photoUrl ? (
            <Image
              src={player.photoUrl}
              alt={`${player.firstName} ${player.lastName}`}
              width={36} height={36}
              className="object-cover w-full h-full"
              loading="lazy"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span style={{ fontSize: '11px', fontWeight: 800, color: tier.color }}>
                {player.firstName[0]}{player.lastName[0]}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1">
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.firstName}{' '}
              <span style={{ color: 'rgba(255,255,255,0.42)', fontWeight: 400 }}>{player.lastName}</span>
            </p>
            <div className="flex items-baseline gap-0.5 shrink-0">
              <span style={{ fontSize: '16px', fontWeight: 900, color: tier.color, lineHeight: 1 }}>{days}</span>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.28)' }}>d</span>
            </div>
          </div>

          <div className="mt-1.5">
            <XPBar days={days} color={tier.color} glow={tier.glow} height={3} />
          </div>

          {/* Bottom row: last victory OR milestone date */}
          <div className="mt-1 flex items-center justify-between gap-1">
            <div>
              {player.hasNeverWon ? (
                <span style={{ fontSize: '8px', fontWeight: 800, color: tier.color, letterSpacing: '0.08em' }}>NUNCA HA GANADO</span>
              ) : player.lastVictoryDate ? (
                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.22)' }}>Ú.V: {player.lastVictoryDate}</span>
              ) : null}
            </div>

            {/* Milestone date (right side) */}
            {milestoneDate && (
              <div className="flex items-center gap-1 shrink-0">
                {matchingGameDate && (
                  <span style={{
                    fontSize: '7px', fontWeight: 800, color: '#00E5FF',
                    padding: '1px 5px', borderRadius: '3px',
                    background: 'rgba(0,229,255,0.14)', border: '1px solid rgba(0,229,255,0.38)',
                    letterSpacing: '0.06em',
                  }}>
                    🎮 F{matchingGameDate.dateNumber}
                  </span>
                )}
                <span style={{ fontSize: '8px', color: isPast ? tier.color : 'rgba(255,255,255,0.35)', fontWeight: isPast ? 700 : 400 }}>
                  {isPast ? '✓ ' : '→ '}{formatDateEs(milestoneDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ──
export default function SinGanarTab({ tournamentId }: { tournamentId?: number }) {
  const { data, error, isLoading } = useSWR<DaysWithoutVictoryResponse>(
    '/api/stats/days-without-victory/1',
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false }
  )

  const { gameDates } = useGameDates(tournamentId ?? null, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  // Build a lookup: localDateStr → { dateNumber, scheduledDate }
  const gameDateMap = useMemo(() => {
    const map = new Map<string, MatchingGameDate>()
    gameDates?.forEach(gd => {
      if (!gd.scheduledDate) return
      const d = new Date(gd.scheduledDate)
      map.set(toLocalYMD(d), { dateNumber: gd.dateNumber, scheduledDate: gd.scheduledDate })
    })
    return map
  }, [gameDates])

  if (isLoading) {
    return (
      <div className="space-y-3 pt-1">
        <div className="h-14 animate-pulse" style={{ borderRadius: '5px', background: 'rgba(0,229,255,0.06)' }} />
        <div className="h-40 animate-pulse" style={{ borderRadius: '5px', background: 'rgba(255,0,64,0.07)' }} />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 animate-pulse" style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center" style={{ borderRadius: '5px', background: 'rgba(255,0,64,0.08)', border: '1px solid rgba(255,0,64,0.25)' }}>
        <p style={{ fontSize: '14px', color: '#FF0040', fontWeight: 700 }}>Error al cargar</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 font-bold"
          style={{ borderRadius: '5px', background: '#FF0040', color: '#fff', fontSize: '12px' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const players = data?.players ?? []
  if (players.length === 0) {
    return (
      <div className="p-8 text-center" style={{ borderRadius: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: '13px' }}>Sin datos disponibles</p>
      </div>
    )
  }

  // Precompute milestone dates and game-date matches for each player
  const playerMeta = players.map(p => {
    const milestoneDate = getMilestoneDate(p.lastVictoryDate)
    const matchingGameDate = milestoneDate ? (gameDateMap.get(toLocalYMD(milestoneDate)) ?? null) : null
    return { milestoneDate, matchingGameDate }
  })

  // Group players by tier
  type TierGroup = { tier: typeof TIERS[0]; entries: Array<{ player: PlayerWithVictoryData; meta: typeof playerMeta[0] }> }
  const groups: TierGroup[] = TIERS.map((tier, i) => {
    const upperBound = i > 0 ? TIERS[i - 1].min : Infinity
    const entries = players
      .map((p, idx) => ({ player: p, meta: playerMeta[idx] }))
      .filter(({ player }) => player.daysWithoutVictory >= tier.min && player.daysWithoutVictory < upperBound)
    return { tier, entries }
  }).filter(g => g.entries.length > 0)

  let rankCursor = 0

  return (
    <div className="space-y-1 pt-1">
      {players.length > 0 && <StatsStrip players={players} />}

      <Club1000Hero
        player={players[0]}
        milestoneDate={playerMeta[0].milestoneDate}
        matchingGameDate={playerMeta[0].matchingGameDate}
      />

      {groups.map(({ tier, entries }) => (
        <div key={tier.key}>
          <TierHeader tier={tier} count={entries.length} />
          {entries.map(({ player, meta }) => {
            rankCursor++
            return (
              <PlayerRow
                key={player.id}
                player={player}
                rank={rankCursor}
                milestoneDate={meta.milestoneDate}
                matchingGameDate={meta.matchingGameDate}
              />
            )
          })}
        </div>
      ))}

      <div style={{ height: '8px' }} />
    </div>
  )
}
