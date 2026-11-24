'use client'

import useSWR from 'swr'
import Image from 'next/image'
import { useMemo } from 'react'
import { useGameDates } from '@/hooks/useGameDates'
import { tile, overline, SOBRE_COLOR } from '../clean-poker/bento'
import { Score, Meter } from '../clean-poker/Score'

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

/**
 * Rampa de severidad de la sequia.
 *
 * Esta pantalla corria con su propio sistema — neon arcade, scanlines y colores
 * tipo #FF0040 / #FAFF00 / #00FF88. Era el tercer lenguaje visual de la app y no
 * sobrevivia al fondo claro. La LOGICA de los tramos no se toca: lo unico que
 * cambia es que los colores salen de la paleta del club.
 *
 * Va de rosa a verde porque es una rampa de gravedad, no una lista de
 * categorias: rosa es territorio de malazos, naranja lo que resta, oro el aviso
 * y verde el que esta al dia. Todos verificados sobre papel (minimo 4.69:1) y
 * como bloque con texto blanco encima (minimo 5.02:1).
 */
const TIERS = [
  { key: 'club',    min: 1000, label: 'CLUB 1000',    color: '#AD1457' },
  { key: 'danger',  min: 900,  label: 'ZONA CRÍTICA', color: '#C2185B' },
  { key: '2years',  min: 730,  label: '+ 2 AÑOS',     color: '#9A3412' },
  { key: '1year',   min: 365,  label: '+ 1 AÑO',      color: '#C2410C' },
  { key: '6months', min: 180,  label: '+ 6 MESES',    color: '#8A6508' },
  { key: 'recent',  min: 0,    label: 'RECIENTES',    color: '#15803D' },
]

function getTier(days: number) {
  return TIERS.find(t => days >= t.min) ?? TIERS[TIERS.length - 1]
}

// ── GAME DATE BADGE ──
/** El hito cae justo en una fecha del calendario: eso es lo informativo, y lo
 *  informativo es el color frio. */
function GameDateBadge({ match, sobreOscuro = false }: { match: MatchingGameDate; sobreOscuro?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 100, marginTop: 6,
      background: sobreOscuro ? 'rgba(91,200,192,0.18)' : 'rgba(15,118,110,0.10)',
      border: `1px solid ${sobreOscuro ? 'rgba(91,200,192,0.5)' : 'rgba(15,118,110,0.35)'}`,
      fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
      color: sobreOscuro ? '#5BC8C0' : '#0F766E',
    }}>
      CAE EN LA FECHA {match.dateNumber}
    </span>
  )
}

// ── TIRA DE RESUMEN ──
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
      {tierCounts.map(({ tier, count }) => (
        <div key={tier.key} style={{ ...tile('papel', 1), padding: 13, gap: 2, borderLeft: `3px solid ${tier.color}` }}>
          <span style={overline(tier.color)}>{tier.label}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
            <Score value={count} size={26} color="var(--cp-on-surface)" />
            <span style={{ fontSize: 11.5, color: 'var(--cp-on-surface-variant)' }}>
              {Math.round((count / total) * 100)}%
            </span>
          </div>
        </div>
      ))}

      <div style={{ ...tile('papel', 1), padding: 13, gap: 2, borderLeft: '3px solid var(--cp-info)' }}>
        <span style={overline('var(--cp-info)')}>promedio</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <Score value={avg} size={26} color="var(--cp-on-surface)" />
          <span style={{ fontSize: 11.5, color: 'var(--cp-on-surface-variant)' }}>días</span>
        </div>
      </div>
    </div>
  )
}

// ── EL HITO DE LOS 1000 DÍAS — el ancla negra ──
function Club1000Hero({ player, milestoneDate, matchingGameDate }: {
  player: PlayerWithVictoryData
  milestoneDate: Date | null
  matchingGameDate: MatchingGameDate | null
}) {
  const days = player.daysWithoutVictory
  const isPast = days >= 1000
  const remaining = 1000 - days
  const pct = Math.min(100, Math.round((days / 1000) * 100))
  // Sobre el bloque negro el rosa profundo no se lee: ahi va el claro.
  const acento = isPast ? '#FF6FA5' : '#FF9E5E'

  return (
    <section className="cp-rise" style={{ ...tile('negro'), gap: 0 }}>
      <span
        aria-hidden
        className="cp-score"
        style={{ position: 'absolute', right: -16, top: -30, fontSize: 150, color: 'rgba(255,255,255,0.05)', lineHeight: 1, pointerEvents: 'none' }}
      >
        {days}
      </span>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={overline(acento)}>
            {isPast ? 'miembro del club 1000' : 'más cerca del hito'}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <Score value={days} size={46} color="#FFF" />
            <span style={{ fontSize: 13, color: SOBRE_COLOR.tenue, fontWeight: 600 }}>días</span>
          </div>

          {!isPast && (
            <div style={{ fontSize: 12, fontWeight: 700, color: acento, marginTop: 3 }}>
              Faltan {remaining} días
            </div>
          )}

          {milestoneDate && (
            <div style={{ fontSize: 12, color: SOBRE_COLOR.suave, marginTop: 4 }}>
              {isPast ? 'Cumplió el ' : 'Se cumple el '}
              <span style={{ fontWeight: 700, color: '#FFF' }}>{formatDateEs(milestoneDate)}</span>
            </div>
          )}

          {matchingGameDate && <GameDateBadge match={matchingGameDate} sobreOscuro />}

          {player.hasNeverWon ? (
            <div style={{ fontSize: 11.5, fontWeight: 800, color: acento, marginTop: 6, letterSpacing: '0.08em' }}>
              NUNCA HA GANADO
            </div>
          ) : player.lastVictoryDate ? (
            <div style={{ fontSize: 11.5, color: SOBRE_COLOR.tenue, marginTop: 6 }}>
              Última victoria: {player.lastVictoryDate}
            </div>
          ) : null}
        </div>

        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%', overflow: 'hidden',
            border: `2px solid ${acento}`,
          }}>
            {player.photoUrl ? (
              <Image src={player.photoUrl} alt={player.firstName} width={62} height={62} className="object-cover w-full h-full" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <span className="cp-score" style={{ fontSize: 17, color: acento }}>
                  {player.firstName[0]}{player.lastName[0]}
                </span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#FFF', marginTop: 6 }}>{player.firstName}</div>
          <div style={{ fontSize: 11, color: SOBRE_COLOR.tenue }}>{player.lastName}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, position: 'relative' }}>
        <Meter
          value={pct / 100}
          color={acento}
          track="rgba(255,255,255,0.14)"
          height={8}
          left={<span style={{ color: SOBRE_COLOR.tenue }}>0</span>}
          right={<span className="cp-score" style={{ fontSize: 14, color: acento }}>{pct}% de 1000</span>}
        />
      </div>
    </section>
  )
}

// ── ENCABEZADO DE TRAMO ──
function TierHeader({ tier, count }: { tier: typeof TIERS[0]; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18, marginBottom: 8 }}>
      <span style={{ width: 3, height: 15, borderRadius: 2, background: tier.color, flexShrink: 0 }} />
      <span style={overline(tier.color)}>{tier.label}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--cp-on-surface-variant)' }}>×{count}</span>
      <span style={{ height: 1, flex: 1, background: 'var(--cp-surface-border)' }} />
    </div>
  )
}

// ── FILA DE JUGADOR ──
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
      ...tile('papel'),
      padding: 11,
      marginBottom: 7,
      borderLeft: `3px solid ${tier.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="cp-score" style={{ width: 18, textAlign: 'center', flexShrink: 0, fontSize: 12, color: 'var(--cp-on-surface-variant)' }}>
          {rank}
        </span>

        <div style={{
          width: 38, height: 38, flexShrink: 0, borderRadius: '50%', overflow: 'hidden',
          border: `2px solid ${tier.color}`,
        }}>
          {player.photoUrl ? (
            <Image
              src={player.photoUrl}
              alt={`${player.firstName} ${player.lastName}`}
              width={38} height={38}
              className="object-cover w-full h-full"
              loading="lazy"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--cp-surface-2)' }}>
              <span className="cp-score" style={{ fontSize: 12, color: tier.color }}>
                {player.firstName[0]}{player.lastName[0]}
              </span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cp-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.firstName}{' '}
              <span style={{ color: 'var(--cp-on-surface-muted)', fontWeight: 400 }}>{player.lastName}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 }}>
              <span className="cp-score" style={{ fontSize: 17, color: tier.color }}>{days}</span>
              <span style={{ fontSize: 11, color: 'var(--cp-on-surface-variant)' }}>d</span>
            </div>
          </div>

          <div style={{ marginTop: 7 }}>
            <Meter value={Math.min(1, days / 1000)} color={tier.color} track="var(--cp-surface-3)" height={4} />
          </div>

          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            {player.hasNeverWon ? (
              <span style={{ fontSize: 10.5, fontWeight: 800, color: tier.color, letterSpacing: '0.08em' }}>NUNCA HA GANADO</span>
            ) : player.lastVictoryDate ? (
              <span style={{ fontSize: 11, color: 'var(--cp-on-surface-variant)' }}>Últ. victoria: {player.lastVictoryDate}</span>
            ) : <span />}

            {milestoneDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {matchingGameDate && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: '#0F766E', letterSpacing: '0.06em',
                    padding: '2px 7px', borderRadius: 100,
                    background: 'rgba(15,118,110,0.10)', border: '1px solid rgba(15,118,110,0.35)',
                  }}>
                    F{matchingGameDate.dateNumber}
                  </span>
                )}
                <span style={{ fontSize: 11, color: isPast ? tier.color : 'var(--cp-on-surface-variant)', fontWeight: isPast ? 700 : 400 }}>
                  {formatDateEs(milestoneDate)}
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
        <div className="cp-skeleton" style={{ height: 78, borderRadius: 20 }} />
        <div className="cp-skeleton" style={{ height: 190, borderRadius: 20 }} />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="cp-skeleton" style={{ height: 82, borderRadius: 20 }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...tile('papel'), padding: 24, alignItems: 'center', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--cp-primary-light)', fontWeight: 700 }}>No se pudieron cargar las sequías</p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 12, padding: '9px 18px', borderRadius: 100, background: '#C62828', color: '#fff', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const players = data?.players ?? []
  if (players.length === 0) {
    return (
      <div style={{ ...tile('papel'), padding: 32, alignItems: 'center' }}>
        <p style={{ color: 'var(--cp-on-surface-variant)', fontSize: 13 }}>Sin datos disponibles</p>
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
    <div className="pt-1">
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
