'use client'

import Image from 'next/image'
import Link from 'next/link'

interface MalazoPlayer {
  position: number
  name: string
  photoUrl?: string
  totalPoints: number
  finalPoints: number
  trend: number
  lastPlaces: number // cantidad de últimos lugares
  absences: number // cantidad de faltas (fechas no jugadas)
}

interface MalazoCardProps {
  players: MalazoPlayer[] // expects 2 players (last 2 in ranking)
}

export function MalazoCard({ players }: MalazoCardProps) {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // Pink color for "malazo" theme
  const PINK_COLOR = '#EC407A'

  return (
    <div
      className="p-4 pt-5"
      style={{
        borderRadius: '5px',
        background: 'linear-gradient(135deg, rgba(80, 8, 38, 0.97) 0%, rgba(180, 30, 90, 0.88) 60%, rgba(220, 50, 120, 0.82) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.50), 0 0 40px rgba(200, 20, 80, 0.24)',
        border: '1px solid rgba(236, 64, 122, 0.22)',
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
          7/2
        </p>
        <Link
          href="/ranking"
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity hover:opacity-80"
        >
          <span style={{ color: '#E53935', fontSize: '12px' }}>Todos</span>
          <span style={{ color: '#E53935', fontSize: '12px' }}>→</span>
        </Link>
      </div>

      {/* Two cards side by side (wider since only 2) */}
      <div className="flex gap-3 justify-center items-end">
        {players.slice(0, 2).map((player) => (
          <div
            key={player.position}
            className="flex-1 flex flex-col items-center relative"
            style={{
              borderRadius: '5px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(236, 64, 122, 0.18)',
              maxWidth: '160px',
              minHeight: '200px',
              paddingTop: '62px', // space for avatar overflow (108/2 + 8)
              paddingBottom: '12px',
              paddingLeft: '12px',
              paddingRight: '12px',
            }}
          >
            {/* Avatar - positioned to overflow top by 50% */}
            <div
              className="absolute overflow-hidden flex items-center justify-center"
              style={{
                width: 108,
                height: 108,
                top: '-54px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderRadius: '5px',
                background: player.photoUrl ? 'transparent' : 'var(--cp-surface-solid)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              }}
            >
              {player.photoUrl ? (
                <Image
                  src={player.photoUrl}
                  alt={player.name}
                  width={108}
                  height={108}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span
                  className="font-semibold"
                  style={{
                    fontSize: 'var(--cp-body-size)',
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
            <div className="flex items-center justify-center gap-3 mb-2">
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

            {/* Pink Divider */}
            <div
              className="w-full h-0.5 mb-1"
              style={{ backgroundColor: PINK_COLOR }}
            />

            {/* Position Number */}
            <p
              className="font-bold mb-1"
              style={{
                fontSize: 'var(--cp-body-size)',
                color: PINK_COLOR,
              }}
            >
              #{player.position}
            </p>

            {/* Últimos & Faltas */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--cp-label-size)',
                    color: player.lastPlaces > 0 ? PINK_COLOR : 'var(--cp-on-surface-muted)',
                  }}
                >
                  {player.lastPlaces}
                </p>
                <p
                  style={{
                    fontSize: '8px',
                    color: 'var(--cp-on-surface-muted)',
                  }}
                >
                  últimos
                </p>
              </div>
              <div className="text-center">
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--cp-label-size)',
                    color: player.absences > 0 ? '#E53935' : 'var(--cp-on-surface-muted)',
                  }}
                >
                  {player.absences}
                </p>
                <p
                  style={{
                    fontSize: '8px',
                    color: 'var(--cp-on-surface-muted)',
                  }}
                >
                  faltas
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MalazoCard
