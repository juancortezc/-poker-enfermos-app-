'use client'

import { scoreOf, SCORE_LABELS } from '@/lib/ranking-utils'
import type { PlayerPositionDelta, PlayerRanking } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'

interface StreaksCardsProps {
  hot: PlayerPositionDelta[]
  /** Los últimos 2 lugares de la tabla actual (7/2) — no un dato de tendencia. */
  cold: PlayerRanking[]
}

export function StreaksCards({ hot, cold }: StreaksCardsProps) {
  if (hot.length === 0 && cold.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cold.length > 0 && (
        <div
          style={{
            background: 'rgba(232,134,60,0.12)',
            border: '1.5px solid rgba(232,134,60,0.55)',
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#E8863C', letterSpacing: '0.04em', marginBottom: 10 }}>LOS MALAZOS 7/2</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
            {cold.map(player => (
              <div
                key={player.playerId}
                style={{
                  textAlign: 'center',
                  background: 'var(--cp-surface-2)',
                  border: '1px solid rgba(232,134,60,0.30)',
                  borderRadius: 14,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <HomeAvatar playerId={player.playerId} name={player.playerName} photoUrl={player.playerPhoto} size={48} fontSize={14} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.playerName}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 4, fontSize: 14, fontWeight: 900, color: '#fff' }}>
                  {scoreOf(player)} <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, color: 'inherit' }}>{SCORE_LABELS.pointsShort}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hot.length > 0 && (
        <div
          style={{
            background: 'rgba(110,203,113,0.14)',
            border: '1.5px solid rgba(110,203,113,0.65)',
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#6ECB71', letterSpacing: '0.04em' }}>LOS QUE VIENEN CALIENTES</div>
          <div style={{ fontSize: 12, color: '#C9BFBA', marginTop: 2, marginBottom: 10 }}>Más posiciones ganadas en las últimas 3 fechas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
            {hot.map(player => (
              <div
                key={player.playerId}
                style={{
                  textAlign: 'center',
                  background: 'var(--cp-surface-2)',
                  border: '1px solid rgba(110,203,113,0.30)',
                  borderRadius: 14,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <HomeAvatar playerId={player.playerId} name={player.playerName} photoUrl={player.playerPhoto} size={46} fontSize={13} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F5EFE6', minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.playerName}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 4, fontSize: 14, fontWeight: 900, color: '#6ECB71' }}>
                  +{player.positionsChanged}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StreaksCards
