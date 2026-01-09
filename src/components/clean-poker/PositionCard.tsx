'use client'

interface PositionCardProps {
  position: number
  totalPoints: number
  finalPoints: number
  trend: number // +6, -2, 0
  leaderPoints: number
  lastPoints: number
  onDetailClick?: () => void
}

export function PositionCard({
  position,
  totalPoints,
  finalPoints,
  trend,
  leaderPoints,
  lastPoints,
  onDetailClick,
}: PositionCardProps) {
  const pointsToLeader = leaderPoints - finalPoints
  const pointsFromLast = finalPoints - lastPoints

  const getTrendColor = () => {
    if (trend > 0) return '#4CAF50' // Verde - sube
    if (trend < 0) return '#E53935' // Rojo - baja
    return '#FFC107' // Amarillo - se mantiene
  }

  const getTrendSymbol = () => {
    if (trend > 0) return '▲'
    if (trend < 0) return '▼'
    return '●'
  }

  return (
    <div
      className="p-4 pt-5 rounded-2xl relative"
      style={{
        background: 'linear-gradient(90deg, rgba(26, 26, 26, 0.95) 0%, rgba(64, 64, 64, 0.85) 100%)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Detail Link - Top Right */}
      {onDetailClick && (
        <button
          onClick={onDetailClick}
          className="absolute top-3 right-3 flex items-center gap-1 transition-opacity hover:opacity-80"
        >
          <span style={{ color: '#E53935', fontSize: '12px' }}>Detalle</span>
          <span style={{ color: '#E53935', fontSize: '12px' }}>→</span>
        </button>
      )}

      {/* Main Row: Position centered + KPIs distributed */}
      <div className="flex items-center">
        {/* Position - centered vertically with "Mi Posición" label */}
        <div className="flex flex-col items-center justify-center shrink-0 mr-4">
          <span
            className="font-extrabold"
            style={{
              fontSize: 'var(--cp-display-size)',
              fontWeight: 'var(--cp-display-weight)',
              color: 'var(--cp-on-surface)',
              lineHeight: 1,
            }}
          >
            #{position}
          </span>
          <span
            style={{
              fontSize: 'var(--cp-caption-size)',
              color: 'var(--cp-on-surface-variant)',
              marginTop: '4px',
            }}
          >
            Mi Posición
          </span>
        </div>

        {/* KPIs - distributed horizontally: Final, Total (darker), Cambio */}
        <div className="flex-1 flex items-center justify-around">
          {/* Final */}
          <div className="text-center">
            <p
              className="font-bold"
              style={{
                fontSize: 'var(--cp-title-size)',
                color: 'var(--cp-on-surface)',
              }}
            >
              {finalPoints}
            </p>
            <p
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-variant)',
              }}
            >
              final
            </p>
          </div>

          {/* Total (darker color to differentiate) */}
          <div className="text-center">
            <p
              className="font-bold"
              style={{
                fontSize: 'var(--cp-title-size)',
                color: 'var(--cp-on-surface-medium)',
              }}
            >
              {totalPoints}
            </p>
            <p
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-variant)',
              }}
            >
              total
            </p>
          </div>

          {/* Trend/Cambio */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span style={{ fontSize: '12px', color: getTrendColor() }}>{getTrendSymbol()}</span>
              <span
                className="font-bold"
                style={{
                  fontSize: 'var(--cp-title-size)',
                  color: 'var(--cp-on-surface)'
                }}
              >
                {Math.abs(trend)}
              </span>
            </div>
            <p
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-variant)',
              }}
            >
              cambio
            </p>
          </div>
        </div>
      </div>

      {/* Helper Text + Detail Link */}
      <div
        className="mt-3 pt-3 relative"
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <p
          className="text-center"
          style={{
            fontSize: 'var(--cp-caption-size)',
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          Te faltan <span style={{ color: '#e0b66c', fontWeight: 600 }}>{pointsToLeader}</span> pts para liderar
          {' · '}
          Estás a <span style={{ color: '#e0b66c', fontWeight: 600 }}>{pointsFromLast}</span> del malazo
        </p>
      </div>
    </div>
  )
}

export default PositionCard
