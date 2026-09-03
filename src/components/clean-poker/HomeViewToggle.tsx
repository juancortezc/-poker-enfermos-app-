'use client'

export type HomeView = 'ultimaFecha' | 'torneo'

interface HomeViewToggleProps {
  value: HomeView
  onChange: (view: HomeView) => void
  ultimaFechaDisabled?: boolean
}

export function HomeViewToggle({ value, onChange, ultimaFechaDisabled = false }: HomeViewToggleProps) {
  const pillStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    flex: 1,
    textAlign: 'center',
    padding: '8px 0',
    borderRadius: 9,
    background: active ? '#E53935' : 'transparent',
    color: active ? '#fff' : '#7A6E62',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.02em',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1
  })

  return (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 3, gap: 3 }}>
      <button
        onClick={() => !ultimaFechaDisabled && onChange('ultimaFecha')}
        disabled={ultimaFechaDisabled}
        style={pillStyle(value === 'ultimaFecha', ultimaFechaDisabled)}
      >
        Última Fecha
      </button>
      <button onClick={() => onChange('torneo')} style={pillStyle(value === 'torneo', false)}>
        Torneo
      </button>
    </div>
  )
}

export default HomeViewToggle
