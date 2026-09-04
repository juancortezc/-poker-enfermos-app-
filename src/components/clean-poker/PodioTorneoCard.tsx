'use client'

import type { PlayerRanking } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'
import { LinkCta } from './LinkCta'

const MEDALS = [
  { bg: 'rgba(232,193,88,0.20)', border: 'rgba(232,193,88,0.55)', color: '#F5D274' },
  { bg: 'rgba(180,185,200,0.16)', border: 'rgba(180,185,200,0.45)', color: '#D6D8E2' },
  { bg: 'rgba(201,138,78,0.20)', border: 'rgba(201,138,78,0.52)', color: '#E0A268' }
]

const TIGHT_RACE_THRESHOLD = 3

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8C158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  )
}

interface PodioTorneoCardProps {
  tournamentNumber: number
  top3: PlayerRanking[]
  /** Muestra el delta de posición desde la última fecha y el aviso de carrera apretada (solo vista "Última Fecha"). */
  showNightContext?: boolean
  onSeeAll?: () => void
}

export function PodioTorneoCard({ tournamentNumber, top3, showNightContext = false, onSeeAll }: PodioTorneoCardProps) {
  if (top3.length === 0) return null

  const scoreOf = (r: PlayerRanking) => r.finalScore ?? r.totalPoints
  const spread = top3.length >= 3 ? scoreOf(top3[0]) - scoreOf(top3[2]) : null
  const isTightRace = showNightContext && spread !== null && spread <= TIGHT_RACE_THRESHOLD

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, rgba(232,193,88,0.16), rgba(232,193,88,0.05))',
        border: '1.5px solid rgba(232,193,88,0.45)',
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 4px 20px rgba(232,193,88,0.10)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <TrophyIcon />
        <div style={{ fontSize: 13, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.05em' }}>
          PODIO TORNEO {tournamentNumber}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        {top3.map((player, index) => {
          const medal = MEDALS[index]
          const delta = showNightContext ? player.positionsChanged : 0
          return (
            <div
              key={player.playerId}
              style={{
                textAlign: 'center',
                background: medal.bg,
                border: `1px solid ${medal.border}`,
                borderRadius: 14,
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 6px', position: 'relative', width: 56 }}>
                <HomeAvatar
                  playerId={player.playerId}
                  name={player.playerName}
                  photoUrl={player.playerPhoto}
                  size={56}
                  fontSize={16}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: -4,
                    left: -4,
                    width: 16,
                    height: 16,
                    borderRadius: 5,
                    background: medal.color,
                    color: '#1A1512',
                    fontSize: 9,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {index + 1}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#F5EFE6', minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {player.playerName}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: medal.color }}>
                  {scoreOf(player)} <span style={{ fontSize: 9, fontWeight: 700 }}>PTS</span>
                </div>
                {showNightContext && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: delta > 0 ? '#7CD07F' : delta < 0 ? '#E53935' : '#A89A8C', marginTop: 1 }}>
                    {delta > 0 ? `+${delta}` : delta === 0 ? '+0' : delta}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isTightRace && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.02em' }}>
            TRES JUGADORES SEPARADOS POR {spread} {spread === 1 ? 'PUNTO' : 'PUNTOS'}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#E53935', marginTop: 2 }}>¡Esto se puso feo!</div>
        </div>
      )}

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <LinkCta onClick={onSeeAll}>VER TABLA COMPLETA →</LinkCta>
      </div>
    </div>
  )
}

export default PodioTorneoCard
