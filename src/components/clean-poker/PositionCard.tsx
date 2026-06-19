'use client'

interface PositionCardProps {
  position: number
  totalPoints: number
  finalPoints: number
  trend: number
  leaderPoints: number
  lastPoints: number
  playerName?: string
  onDetailClick?: () => void
}

export function PositionCard({
  position,
  totalPoints,
  finalPoints,
  trend,
  leaderPoints,
  playerName,
  onDetailClick,
}: PositionCardProps) {
  const isLeader = position === 1
  const gap = leaderPoints - finalPoints
  const pct = leaderPoints > 0 ? Math.round((finalPoints / leaderPoints) * 100) : 100

  const shortName = playerName
    ? (() => { const p = playerName.split(' ').filter(Boolean); return p.length > 1 ? `${p[0]} ${p[p.length-1][0]}.` : p[0] })()
    : 'Tú'

  const trendColor = trend > 0 ? '#4CAF50' : trend < 0 ? '#E53935' : '#FFC107'
  const trendSymbol = trend > 0 ? '▲' : trend < 0 ? '▼' : '●'

  return (
    <div
      className="px-4 py-2.5 relative"
      style={{
        borderRadius: '5px',
        background: 'linear-gradient(135deg, #0e0510 0%, #1c0a1a 45%, #0a0308 100%)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.6), 0 0 24px rgba(180,20,60,0.10)',
        border: '1px solid rgba(220,40,80,0.18)',
      }}
    >
      {/* Top row */}
      <div className="flex items-center gap-3 mb-2">
        {/* Position */}
        <div className="shrink-0">
          <span className="font-extrabold" style={{ fontSize: '26px', color: '#fff', lineHeight: 1 }}>
            #{position}
          </span>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.05em', marginTop: '1px' }}>
            MI POSICIÓN
          </p>
        </div>

        {/* Stats: final · total · cambio */}
        <div className="flex-1 flex items-center justify-around">
          <div className="text-center">
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{finalPoints}</p>
            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>final</p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', lineHeight: 1 }}>{totalPoints}</p>
            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>total</p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: '14px', fontWeight: 700, color: trendColor, lineHeight: 1 }}>
              {trendSymbol}{Math.abs(trend)}
            </p>
            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>cambio</p>
          </div>
        </div>

        {/* Detalle */}
        {onDetailClick && (
          <button onClick={onDetailClick} className="shrink-0 hover:opacity-80">
            <span style={{ color: '#E53935', fontSize: '11px' }}>Detalle →</span>
          </button>
        )}
      </div>

      {/* Bars */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '8px' }}>

        {/* Tú */}
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', width: '34px', textAlign: 'right', flexShrink: 0 }}>
            {shortName}
          </span>
          <div className="flex-1 relative" style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pct}%`, borderRadius: '3px',
              background: isLeader
                ? 'linear-gradient(90deg, #F57F17, #FFD700)'
                : 'linear-gradient(90deg, #006064, #00E5FF)',
              boxShadow: isLeader
                ? '0 0 6px rgba(255,210,0,0.5)'
                : '0 0 6px rgba(0,229,255,0.4)',
            }} />
          </div>
          <div className="flex items-center gap-1" style={{ width: '48px', flexShrink: 0, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>{finalPoints}</span>
            {!isLeader && (
              <span style={{ fontSize: '9px', color: '#E53935', fontWeight: 600 }}>−{gap}</span>
            )}
          </div>
        </div>

        {/* Líder */}
        {!isLeader && (
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', width: '34px', textAlign: 'right', flexShrink: 0 }}>
              Líder
            </span>
            <div className="flex-1 relative" style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: '100%', borderRadius: '3px',
                background: 'linear-gradient(90deg, #F57F17, #FFD700)',
                boxShadow: '0 0 6px rgba(255,210,0,0.45)',
              }} />
            </div>
            <span style={{ fontSize: '10px', color: '#FFD700', fontWeight: 700, width: '48px', textAlign: 'right', flexShrink: 0 }}>
              {leaderPoints}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default PositionCard
