'use client'

import type { PlayerPositionDelta } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'

interface StreaksCardsProps {
  hot: PlayerPositionDelta[]
  cold: PlayerPositionDelta[]
}

export function StreaksCards({ hot, cold }: StreaksCardsProps) {
  if (hot.length === 0 && cold.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cold.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(160deg,#EC407A,#AD1457)',
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.04em', marginBottom: 10 }}>LOS MALAZOS 7/2</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
            {cold.map(player => (
              <div
                key={player.playerId}
                style={{
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.18)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 14,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <HomeAvatar playerId={player.playerId} name={player.playerName} photoUrl={player.playerPhoto} size={48} fontSize={14} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.playerName}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 4, fontSize: 14, fontWeight: 900, color: '#fff' }}>
                  {player.points} <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.85 }}>PTS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hot.length > 0 && (
        <div
          style={{
            background: 'rgba(76,175,80,0.14)',
            border: '1.5px solid rgba(76,175,80,0.65)',
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: '#7CD07F', letterSpacing: '0.04em' }}>LOS QUE VIENEN CALIENTES</div>
          <div style={{ fontSize: 9, color: '#B7E0B8', marginTop: 2, marginBottom: 10 }}>Más posiciones ganadas en las últimas 3 fechas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
            {hot.map(player => (
              <div
                key={player.playerId}
                style={{
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.16)',
                  border: '1px solid rgba(76,175,80,0.30)',
                  borderRadius: 14,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <HomeAvatar playerId={player.playerId} name={player.playerName} photoUrl={player.playerPhoto} size={46} fontSize={13} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F5EFE6', minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.playerName}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 4, fontSize: 14, fontWeight: 900, color: '#7CD07F' }}>
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
