'use client'

import Image from 'next/image'
import Link from 'next/link'

interface PodioPlayer {
  position: number
  name: string
  photoUrl?: string
  totalPoints: number
  finalPoints: number
  trend: number // +2, -1, 0
  victories: number // #victorias en el torneo
  podiums: number // #podios en el torneo
}

interface PodioCardProps {
  players: PodioPlayer[]
  tournamentNumber?: number
}

export function PodioCard({ players }: PodioCardProps) {
  const getTrendColor = (trend: number) => {
    if (trend > 0) return '#4CAF50' // Verde
    if (trend < 0) return '#E53935' // Rojo
    return '#FFC107' // Amarillo
  }

  const getTrendSymbol = (trend: number) => {
    if (trend > 0) return '▲'
    if (trend < 0) return '▼'
    return '●'
  }

  const getMedalColor = (position: number) => {
    if (position === 1) return '#FFD700'
    if (position === 2) return '#C8C8D8'
    if (position === 3) return '#CD7F32'
    return 'var(--cp-on-surface-variant)'
  }

  const getMedalCardStyle = (position: number, isWinner: boolean) => {
    const base = {
      borderRadius: '5px',
      maxWidth: isWinner ? '130px' : '105px',
      minHeight: isWinner ? '215px' : '185px',
      marginTop: isWinner ? '0' : '30px',
      paddingBottom: '10px',
      paddingLeft: '8px',
      paddingRight: '8px',
    }
    if (position === 1) return {
      ...base,
      background: 'linear-gradient(165deg, #1e1600 0%, #342200 50%, #1e1400 100%)',
      border: '1px solid rgba(255, 210, 0, 0.55)',
      boxShadow: '0 16px 44px rgba(0,0,0,0.75), 0 0 48px rgba(255,185,0,0.38), inset 0 1px 0 rgba(255,220,0,0.24)',
    }
    if (position === 2) return {
      ...base,
      background: 'linear-gradient(165deg, #0e0e18 0%, #181826 50%, #0e0e18 100%)',
      border: '1px solid rgba(200, 210, 240, 0.42)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.70), 0 0 32px rgba(180,190,230,0.26), inset 0 1px 0 rgba(220,225,255,0.16)',
    }
    return {
      ...base,
      background: 'linear-gradient(165deg, #1a0e00 0%, #2c1800 50%, #1a0e00 100%)',
      border: '1px solid rgba(205, 130, 50, 0.48)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.70), 0 0 32px rgba(185,105,30,0.28), inset 0 1px 0 rgba(210,145,55,0.18)',
    }
  }

  const getMedalAvatarShadow = (position: number) => {
    if (position === 1) return '0 6px 20px rgba(0,0,0,0.7), 0 0 16px rgba(255,185,0,0.30)'
    if (position === 2) return '0 6px 16px rgba(0,0,0,0.65), 0 0 12px rgba(180,180,220,0.18)'
    return '0 6px 16px rgba(0,0,0,0.65), 0 0 12px rgba(180,100,30,0.20)'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // Reorder players: 2nd, 1st, 3rd
  const orderedPlayers = [
    players.find(p => p.position === 2),
    players.find(p => p.position === 1),
    players.find(p => p.position === 3),
  ].filter(Boolean) as PodioPlayer[]

  // Get avatar size based on position
  const getAvatarSize = (position: number) => {
    if (position === 1) return { size: 120, border: 2 }
    return { size: 96, border: 1.5 }
  }

  return (
    <div
      className="p-4 pt-5"
      style={{
        borderRadius: '5px',
        background: 'linear-gradient(160deg, #090d1e 0%, #121b38 50%, #0c1228 100%)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.70), 0 0 50px rgba(40,60,180,0.08)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header with title and link */}
      <div className="relative mb-8">
        <p
          className="text-center"
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-on-surface-variant)',
          }}
        >
          Podio Torneo
        </p>
        <Link
          href="/ranking"
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity hover:opacity-80"
        >
          <span style={{ color: '#E53935', fontSize: '12px' }}>Todos</span>
          <span style={{ color: '#E53935', fontSize: '12px' }}>→</span>
        </Link>
      </div>

      {/* Podium Cards */}
      <div className="flex gap-2 justify-center items-end">
        {orderedPlayers.map((player) => {
          const avatarConfig = getAvatarSize(player.position)
          const isWinner = player.position === 1

          return (
            <div
              key={player.position}
              className="flex-1 flex flex-col items-center relative"
              style={{
                ...getMedalCardStyle(player.position, isWinner),
                paddingTop: `${avatarConfig.size / 2 + 8}px`,
              }}
            >
              {/* Avatar - positioned to overflow top by 50% */}
              <div
                className="absolute overflow-hidden flex items-center justify-center"
                style={{
                  width: avatarConfig.size,
                  height: avatarConfig.size,
                  top: `-${avatarConfig.size / 2}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderRadius: '5px',
                  background: player.photoUrl ? 'transparent' : 'var(--cp-surface-solid)',
                  boxShadow: getMedalAvatarShadow(player.position),
                }}
              >
                {player.photoUrl ? (
                  <Image
                    src={player.photoUrl}
                    alt={player.name}
                    width={avatarConfig.size}
                    height={avatarConfig.size}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: isWinner ? 'var(--cp-body-size)' : 'var(--cp-label-size)',
                      color: 'var(--cp-on-surface-variant)',
                    }}
                  >
                    {getInitials(player.name)}
                  </span>
                )}
              </div>

              {/* Name */}
              <p
                className="text-center font-medium truncate w-full mb-2"
                style={{
                  fontSize: 'var(--cp-caption-size)',
                  color: 'var(--cp-on-surface)',
                }}
              >
                {(() => { const p = player.name.split(' ').filter(Boolean); return p.length > 1 ? `${p[0]} ${p[p.length-1][0]}.` : p[0] })()}
              </p>

              {/* Stats: Final, Total (darker), Cambio */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {/* Final */}
                <div className="text-center">
                  <p
                    className="font-bold"
                    style={{
                      fontSize: 'var(--cp-label-size)',
                      color: 'var(--cp-on-surface)',
                    }}
                  >
                    {player.finalPoints}
                  </p>
                  <p
                    style={{
                      fontSize: '9px',
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    final
                  </p>
                </div>

                {/* Total (darker color) */}
                <div className="text-center">
                  <p
                    className="font-bold"
                    style={{
                      fontSize: 'var(--cp-label-size)',
                      color: 'var(--cp-on-surface-medium)',
                    }}
                  >
                    {player.totalPoints}
                  </p>
                  <p
                    style={{
                      fontSize: '9px',
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    total
                  </p>
                </div>

                {/* Cambio */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <span style={{ fontSize: '8px', color: getTrendColor(player.trend) }}>
                      {getTrendSymbol(player.trend)}
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        fontSize: 'var(--cp-label-size)',
                        color: 'var(--cp-on-surface)',
                      }}
                    >
                      {Math.abs(player.trend)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '9px',
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    cambio
                  </p>
                </div>
              </div>

              {/* Medal Divider */}
              <div
                className="w-full h-0.5 mb-1"
                style={{ backgroundColor: getMedalColor(player.position) }}
              />

              {/* Position Number */}
              <p
                className="font-bold mb-1"
                style={{
                  fontSize: isWinner ? 'var(--cp-title-size)' : 'var(--cp-body-size)',
                  color: getMedalColor(player.position),
                }}
              >
                #{player.position}
              </p>

              {/* Victories & Podiums */}
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <p
                    className="font-bold"
                    style={{
                      fontSize: 'var(--cp-label-size)',
                      color: player.victories > 0 ? '#FFD700' : 'var(--cp-on-surface-muted)',
                    }}
                  >
                    {player.victories}
                  </p>
                  <p
                    style={{
                      fontSize: '8px',
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    victorias
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="font-bold"
                    style={{
                      fontSize: 'var(--cp-label-size)',
                      color: player.podiums > 0 ? 'var(--cp-on-surface-variant)' : 'var(--cp-on-surface-muted)',
                    }}
                  >
                    {player.podiums}
                  </p>
                  <p
                    style={{
                      fontSize: '8px',
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    podios
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PodioCard
