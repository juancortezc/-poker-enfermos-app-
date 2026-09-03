'use client'

import type { PlayerPositionDelta } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'

interface StreaksCardsProps {
  hot: PlayerPositionDelta[]
  cold: PlayerPositionDelta[]
  onSeeAllHot?: () => void
}

export function StreaksCards({ hot, cold, onSeeAllHot }: StreaksCardsProps) {
  if (hot.length === 0 && cold.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cold.length > 0 && (
        <div
          style={{
            background: 'rgba(229,57,53,0.08)',
            border: '1px solid rgba(229,57,53,0.24)',
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#FF8783', letterSpacing: '0.04em' }}>LOS MALAZOS 7/2</div>
            <span style={{ fontSize: 13 }}>😅</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {cold.map(player => (
              <div key={player.playerId} style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <HomeAvatar playerId={player.playerId} name={player.playerName} photoUrl={player.playerPhoto} size={48} fontSize={14} />
                <div style={{ fontSize: 9, fontWeight: 700, color: '#F5EFE6' }}>{player.playerName}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#E53935' }}>{player.positionsChanged}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hot.length > 0 && (
        <div
          style={{
            background: 'rgba(76,175,80,0.08)',
            border: '1px solid rgba(76,175,80,0.24)',
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#7CD07F', letterSpacing: '0.04em' }}>LOS QUE VIENEN CALIENTES</div>
            <span style={{ fontSize: 13 }}>🔥</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {hot.map(player => (
              <div key={player.playerId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <HomeAvatar playerId={player.playerId} name={player.playerName} photoUrl={player.playerPhoto} size={46} fontSize={13} />
                <div style={{ fontSize: 9, fontWeight: 700, color: '#F5EFE6' }}>{player.playerName}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#4CAF50' }}>+{player.positionsChanged}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button
              onClick={onSeeAllHot}
              style={{ fontSize: 10, fontWeight: 700, color: '#7CD07F', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              VER TODOS →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StreaksCards
