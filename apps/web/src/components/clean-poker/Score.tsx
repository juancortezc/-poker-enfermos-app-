'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Primitivas de marcador.
 *
 * La app mostraba todos sus numeros como texto corriente: mismo peso, misma
 * cara, mismo tamano que una etiqueta. Un puntaje que no se distingue de un
 * rotulo no se lee como puntaje. Aca viven las tres piezas que hacen que un
 * numero parezca un marcador: cara de display, cuenta al aparecer y barra que
 * se llena.
 *
 * Todo respeta `prefers-reduced-motion`: quien pide menos movimiento ve el
 * valor final de una, nunca un numero saltando.
 */

function prefiereQuietud() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Cuenta de 0 al valor cuando el elemento entra en pantalla. */
export function useCountUp(target: number, duracion = 900) {
  const [valor, setValor] = useState(() => (prefiereQuietud() ? target : 0))
  const ref = useRef<HTMLSpanElement | null>(null)
  const yaCorrio = useRef(false)

  useEffect(() => {
    if (prefiereQuietud()) { setValor(target); return }
    const el = ref.current
    if (!el) return

    const arrancar = () => {
      if (yaCorrio.current) return
      yaCorrio.current = true
      const t0 = performance.now()
      const paso = (t: number) => {
        const p = Math.min(1, (t - t0) / duracion)
        // easeOutCubic: arranca rapido y frena, que es como se lee un marcador
        const e = 1 - Math.pow(1 - p, 3)
        setValor(Math.round(target * e))
        if (p < 1) requestAnimationFrame(paso)
        else setValor(target)
      }
      requestAnimationFrame(paso)
    }

    const obs = new IntersectionObserver(
      entradas => entradas.forEach(e => { if (e.isIntersecting) arrancar() }),
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duracion])

  return { valor, ref }
}

interface ScoreProps {
  value: number
  /** Sufijo pequeno pegado al numero: PTS, pos, etc. */
  suffix?: ReactNode
  size?: number
  color?: string
  /** Signo explicito para deltas (+3 / -2). */
  signed?: boolean
  style?: CSSProperties
}

/** Un numero de marcador: cara de display, ancho fijo y cuenta al aparecer. */
export function Score({ value, suffix, size = 30, color, signed = false, style }: ScoreProps) {
  const { valor, ref } = useCountUp(Math.abs(value))
  const signo = signed && value > 0 ? '+' : signed && value < 0 ? '−' : ''
  return (
    <span
      ref={ref}
      className="cp-score"
      style={{ fontSize: size, lineHeight: 1, color, display: 'inline-flex', alignItems: 'baseline', gap: 4, ...style }}
    >
      {signo}{valor}
      {suffix && (
        <span style={{ fontSize: Math.max(11, Math.round(size * 0.38)), fontWeight: 700, letterSpacing: '0.06em', opacity: 0.7 }}>
          {suffix}
        </span>
      )}
    </span>
  )
}

interface MeterProps {
  /** 0 a 1. */
  value: number
  color?: string
  track?: string
  height?: number
  /** Etiquetas a los costados, encima de la barra. */
  left?: ReactNode
  right?: ReactNode
}

/** Barra de progreso que se llena al aparecer. */
export function Meter({ value, color = 'var(--cp-primary)', track = 'rgba(255,255,255,0.14)', height = 8, left, right }: MeterProps) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {(left || right) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
          {left}{right}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height, borderRadius: height, background: track, overflow: 'hidden' }}
      >
        <div
          className="cp-bar-fill"
          style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, background: color }}
        />
      </div>
    </div>
  )
}
