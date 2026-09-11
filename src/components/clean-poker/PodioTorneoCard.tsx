'use client'

import { scoreOf, SCORE_LABELS } from '@/lib/ranking-utils'
import type { PlayerRanking } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'
import { LinkCta } from './LinkCta'

// chip = fondo de la medalla (claro, con el numero oscuro encima)
// text = el mismo metal COMO TEXTO sobre papel: 5:1 o mejor
const MEDALS = [
  { chip: '#E8C158', border: 'rgba(127,93,7,0.45)',  text: '#7F5D07' },
  { chip: '#C9C6C2', border: 'rgba(110,106,103,0.40)', text: '#6E6A67' },
  { chip: '#C08A54', border: 'rgba(139,94,47,0.42)', text: '#8B5E2F' }
]

const TIGHT_RACE_THRESHOLD = 3

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F5D07" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
  onSeeTabla?: () => void
}

export function PodioTorneoCard({ tournamentNumber, top3, showNightContext = false, onSeeTabla }: PodioTorneoCardProps) {
  if (top3.length === 0) return null

  const spread = top3.length >= 3 ? scoreOf(top3[0]) - scoreOf(top3[2]) : null
  const isTightRace = showNightContext && spread !== null && spread <= TIGHT_RACE_THRESHOLD

  return (
    <div
      style={{
        background: 'linear-gradient(150deg,#FCF4DE 0%,#F5E7BE 60%,#EEDCA6 100%)',
        border: '1px solid rgba(127,93,7,0.45)',
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 12px 34px rgba(0,0,0,0.45), 0 0 30px rgba(232,193,88,0.14)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <TrophyIcon />
        <div style={{ fontSize: 13, fontWeight: 800, color: '#7F5D07', letterSpacing: '0.05em' }}>
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
                background: 'rgba(255,255,255,0.62)',
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
                    background: medal.chip,
                    color: '#1D1615',
                    fontSize: 12,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {index + 1}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1615', minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {player.playerName}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: medal.text }}>
                  {scoreOf(player)} <span style={{ fontSize: 12, fontWeight: 700, color: 'inherit' }}>{SCORE_LABELS.pointsShort}</span>
                </div>
                {showNightContext && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: delta > 0 ? '#136B34' : delta < 0 ? '#A8360A' : '#574C49', marginTop: 1 }}>
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
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1615', letterSpacing: '0.02em' }}>
            TRES JUGADORES SEPARADOS POR {spread} {spread === 1 ? 'PUNTO' : 'PUNTOS'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#C62828', marginTop: 2 }}>¡Esto se puso feo!</div>
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
        <LinkCta onClick={onSeeTabla} style={{ color: '#C62828' }}>VER LA TABLA DEL TORNEO →</LinkCta>
      </div>
    </div>
  )
}

export default PodioTorneoCard
