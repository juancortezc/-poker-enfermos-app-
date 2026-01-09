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
    if (position === 1) return '#FFD700' // Oro
    if (position === 2) return '#C0C0C0' // Plata
    if (position === 3) return '#CD7F32' // Bronce
    return 'var(--cp-on-surface-variant)'
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

  // Get avatar size based on position (minimal border)
  const getAvatarSize = (position: number) => {
    if (position === 1) return { size: 80, border: 2 }
    return { size: 64, border: 1.5 }
  }

  return (
    <div
      className="p-4 pt-5 rounded-2xl"
      style={{
        background: 'linear-gradient(90deg, rgba(26, 26, 26, 0.95) 0%, rgba(64, 64, 64, 0.85) 100%)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
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
              className="flex-1 rounded-xl flex flex-col items-center relative"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                maxWidth: isWinner ? '130px' : '105px',
                minHeight: isWinner ? '190px' : '160px',
                marginTop: isWinner ? '0' : '30px',
                paddingTop: `${avatarConfig.size / 2 + 8}px`,
                paddingBottom: '12px',
                paddingLeft: '8px',
                paddingRight: '8px',
              }}
            >
              {/* Avatar - positioned to overflow top by 50% */}
              <div
                className="absolute rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  width: avatarConfig.size,
                  height: avatarConfig.size,
                  top: `-${avatarConfig.size / 2}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: player.photoUrl ? 'transparent' : 'var(--cp-surface-solid)',
                  border: `${avatarConfig.border}px solid ${getMedalColor(player.position)}`,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
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
                className="text-center font-medium truncate w-full mb-3"
                style={{
                  fontSize: 'var(--cp-caption-size)',
                  color: 'var(--cp-on-surface)',
                }}
              >
                {player.name.split(' ')[0]}
              </p>

              {/* Stats: Final, Total (darker), Cambio */}
              <div className="flex items-center justify-center gap-2 mb-3">
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
                className="w-full h-0.5 mb-2"
                style={{ backgroundColor: getMedalColor(player.position) }}
              />

              {/* Position Number */}
              <p
                className="font-bold mb-2"
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
