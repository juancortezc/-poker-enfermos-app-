'use client'

import { scoreOf, eliminatedDateNumbers } from '@/lib/ranking-utils'
import type { PlayerRanking } from '@/lib/ranking-utils'

/**
 * El ELIMINA, dibujado.
 *
 * Es la mecanica central del campeonato — cuentan tus mejores N fechas — y en
 * la app era una frase: "Descartas 23 pts". Un numero suelto no deja ver que
 * se descarto, ni cuanto falta por jugar, ni como viene la racha.
 *
 * Como tira es el marcador del torneo: cada fecha es una barra de altura
 * proporcional a sus puntos, las descartadas van punteadas en naranja y las que
 * faltan quedan vacias.
 *
 * Que fechas se descartan lo decide `eliminatedDateNumbers`, el mismo criterio
 * que usa el ranking. No reimplementarlo aca: emparejar por puntaje falla con
 * fechas empatadas y se olvida del tercer descarte cuando el torneo lo usa.
 */

interface EliminaStripProps {
  player: PlayerRanking
  /** Numeros de fecha ya jugadas, en orden. */
  completedDates: number[]
  /** Total de fechas del torneo. */
  totalDates: number
  /** Cuantas peores fechas descarta este torneo (2 o 3). */
  datesToEliminate: number
}

export function EliminaStrip({ player, completedDates, totalDates, datesToEliminate }: EliminaStripProps) {
  if (completedDates.length === 0) return null

  const fuera = eliminatedDateNumbers(player, datesToEliminate)
  const barras = completedDates.map(d => ({
    fecha: d,
    pts: player.pointsByDate[d] ?? 0,
    fuera: fuera.has(d)
  }))

  const max = Math.max(...barras.map(b => b.pts), 1)
  const cuentan = barras.filter(b => !b.fuera)
  const sumaCuenta = cuentan.reduce((a, b) => a + b.pts, 0)
  const sumaFuera = barras.filter(b => b.fuera).reduce((a, b) => a + b.pts, 0)
  const porJugar = Math.max(0, totalDates - barras.length)
  const multas = player.pointPenalty ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span className="cp-display" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--cp-on-surface-muted)' }}>
          ELIMINA {datesToEliminate}
        </span>
        <span style={{ fontSize: 12, color: 'var(--cp-on-surface-variant)' }}>
          {cuentan.length} cuentan · {porJugar} por jugar
        </span>
      </div>

      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 46 }}>
        {barras.map((b, i) => (
          <div
            key={b.fecha}
            title={`Fecha ${b.fecha}: ${b.pts} pts${b.fuera ? ' (descartada)' : ''}`}
            style={{
              flex: 1,
              minWidth: 0,
              height: `${Math.max(12, (b.pts / max) * 100)}%`,
              borderRadius: 3,
              background: b.fuera ? 'transparent' : 'var(--cp-primary)',
              border: b.fuera ? '1px dashed var(--cp-negative)' : '1px solid transparent',
              opacity: b.fuera ? 1 : 0.55 + 0.45 * (b.pts / max),
              animation: 'cp-fill 700ms cubic-bezier(0.22,1,0.36,1) both',
              animationDelay: `${i * 35}ms`,
              transformOrigin: 'bottom center'
            }}
          />
        ))}
        {Array.from({ length: porJugar }).map((_, i) => (
          <div
            key={`falta-${i}`}
            title="Fecha por jugar"
            style={{ flex: 1, minWidth: 0, height: '12%', borderRadius: 3, background: 'rgba(255,255,255,0.10)' }}
          />
        ))}
      </div>

      {/* Los descartados NO se restan de los que cuentan: ya estan fuera de esa
          suma. Son dos hechos, no una operacion — poner un menos delante decia
          algo falso. Lo unico que si se resta son las multas. */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ color: 'var(--cp-on-surface-muted)' }}>
          <span className="cp-score" style={{ fontSize: 14, color: 'var(--cp-on-surface)' }}>{sumaCuenta}</span> cuentan
        </span>
        {sumaFuera > 0 && (
          <span style={{ color: 'var(--cp-negative)' }}>
            <span className="cp-score" style={{ fontSize: 14, color: 'var(--cp-negative)' }}>{sumaFuera}</span> fuera
          </span>
        )}
        {multas > 0 && (
          <span style={{ color: 'var(--cp-negative)' }}>
            −<span className="cp-score" style={{ fontSize: 14, color: 'var(--cp-negative)' }}>{multas}</span> multas
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--cp-on-surface-variant)', display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          {multas > 0 && '='}
          <span className="cp-score" style={{ fontSize: 16, color: 'var(--cp-on-surface)' }}>{scoreOf(player)}</span>
          <span style={{ fontWeight: 700, letterSpacing: '0.06em' }}>PTS</span>
        </span>
      </div>
    </div>
  )
}

export default EliminaStrip
