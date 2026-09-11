import type { CSSProperties } from 'react'

/**
 * Sistema de bloques del home.
 *
 * La pantalla era una pila de bandas del mismo ancho y el mismo peso: sin
 * jerarquia no hay donde mirar primero. Esto es una grilla de dos columnas
 * donde cada bloque ocupa distinto espacio y tiene distinto tratamiento.
 *
 * Sobre papel hacen falta ANCLAS. Un fondo claro de punta a punta se lee como
 * una sabana sin divisiones, asi que el negro, el rosa y el verde vuelven —
 * pero como piezas dentro de la pantalla, no como el suelo de todo.
 *
 * Cada variante ya trae verificado el contraste del texto que va encima:
 *   negro #17120F  blanco 18.6:1     rosa #AD1457  blanco 7.0:1
 *   verde #0F5C2C  blanco 8.1:1      oro claro     tinta 15.6:1
 */
export type TileTone = 'papel' | 'negro' | 'rosa' | 'verde' | 'oro'

/** Un bloque de la grilla. `span` es cuantas de las dos columnas ocupa. */
export function tile(tone: TileTone, span: 1 | 2 = 2): CSSProperties {
  const base: CSSProperties = {
    gridColumn: `span ${span}`,
    borderRadius: 20,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  }
  switch (tone) {
    case 'negro':
      return { ...base,
        background: 'linear-gradient(150deg, #241D19 0%, #17120F 100%)',
        color: '#FFF', boxShadow: '0 14px 30px rgba(23,18,15,0.28)' }
    case 'rosa':
      return { ...base,
        background: 'linear-gradient(150deg, #D81B60 0%, #AD1457 100%)',
        color: '#FFF', boxShadow: '0 12px 26px rgba(173,20,87,0.30)' }
    case 'verde':
      return { ...base,
        background: 'linear-gradient(150deg, #15803D 0%, #0F5C2C 100%)',
        color: '#FFF', boxShadow: '0 12px 26px rgba(15,92,44,0.28)' }
    case 'oro':
      return { ...base,
        background: 'linear-gradient(150deg, #FCF4DE 0%, #F3E6C2 100%)',
        border: '1px solid rgba(138,101,8,0.30)',
        color: 'var(--cp-on-surface)',
        boxShadow: '0 10px 24px rgba(23,18,15,0.07)' }
    default:
      return { ...base,
        background: '#FFF',
        border: '1px solid var(--cp-surface-border)',
        color: 'var(--cp-on-surface)',
        boxShadow: '0 6px 18px rgba(23,18,15,0.05)' }
  }
}

/** Rotulo chico en mayuscula. El extremo bajo de la escala tipografica. */
export function overline(color?: string): CSSProperties {
  return {
    fontFamily: 'var(--cp-font-display)',
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: color ?? 'var(--cp-on-surface-variant)'
  }
}

/** La grilla que contiene los bloques. */
export const BENTO: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12
}

/** Texto sobre los bloques oscuros o de color. */
export const SOBRE_COLOR = {
  fuerte: '#FFF',
  suave: 'rgba(255,255,255,0.72)',
  tenue: 'rgba(255,255,255,0.55)',
  linea: '1px solid rgba(255,255,255,0.16)'
}
