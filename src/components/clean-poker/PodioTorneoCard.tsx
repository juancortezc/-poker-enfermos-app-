'use client'

import type { PlayerRanking } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'
import { HomeCard } from './HomeCard'
import { LinkCta } from './LinkCta'

const MEDALS = [
  { bg: 'rgba(216,168,78,0.20)', border: 'rgba(216,168,78,0.55)', color: '#F0C875' },
  { bg: 'rgba(180,185,200,0.16)', border: 'rgba(180,185,200,0.45)', color: '#D6D8E2' },
  { bg: 'rgba(201,138,78,0.20)', border: 'rgba(201,138,78,0.52)', color: '#E0A268' }
]

const TIGHT_RACE_THRESHOLD = 3

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
    <HomeCard style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.04em' }}>
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
        <div
          style={{
            marginTop: 12,
            background: 'rgba(229,57,53,0.20)',
            border: '1px solid rgba(229,57,53,0.55)',
            borderRadius: 12,
            padding: '10px 12px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: '#FF8783', letterSpacing: '0.02em' }}>
            TRES JUGADORES SEPARADOS POR {spread} {spread === 1 ? 'PUNTO' : 'PUNTOS'}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#FF8783', marginTop: 2 }}>¡Esto se puso feo!</div>
        </div>
      )}

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <LinkCta onClick={onSeeAll}>VER TABLA COMPLETA →</LinkCta>
      </div>
    </HomeCard>
  )
}

export default PodioTorneoCard
