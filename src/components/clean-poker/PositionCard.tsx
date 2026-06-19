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
      className="px-3 py-2 relative"
      style={{
        borderRadius: '5px',
        background: 'linear-gradient(135deg, #0e0510 0%, #1c0a1a 45%, #0a0308 100%)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.55), 0 0 32px rgba(180,15,55,0.18)',
        border: '1px solid rgba(220,40,80,0.18)',
      }}
    >
      {/* Top row: position + inline stats */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-extrabold shrink-0" style={{ fontSize: '22px', color: '#fff', lineHeight: 1 }}>
          #{position}
        </span>
        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', flexShrink: 0 }}>POS</span>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

        <div className="flex items-baseline gap-1 shrink-0">
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{finalPoints}</span>
          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>fin</span>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>{totalPoints}</span>
          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.30)' }}>tot</span>
        </div>
        <div className="flex items-baseline gap-0.5 shrink-0">
          <span style={{ fontSize: '13px', fontWeight: 700, color: trendColor, lineHeight: 1 }}>{trendSymbol}{Math.abs(trend)}</span>
        </div>

        {onDetailClick && (
          <button onClick={onDetailClick} className="ml-auto shrink-0 hover:opacity-80">
            <span style={{ color: '#E53935', fontSize: '10px' }}>Detalle →</span>
          </button>
        )}
      </div>

      {/* Bars */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '6px' }}>

        {/* Tú */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', width: '40px', textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', width: '40px', textAlign: 'right', flexShrink: 0 }}>
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
