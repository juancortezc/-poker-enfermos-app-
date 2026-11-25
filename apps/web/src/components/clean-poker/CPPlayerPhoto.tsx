'use client'

import Image from 'next/image'
import { getInitials } from '@/lib/avatar-utils'

/**
 * Foto de jugador para filas y listas.
 *
 * - Pasa SIEMPRE por el optimizador de Next: con `width`/`height` fijos, Next
 *   arma el srcset 1x/2x y el navegador nunca baja el original de 600x800.
 * - Cuadrada por defecto (las filas); `aspect="portrait"` la deja en 3:4, que
 *   es el recorte del perfil sin marco y se ve entera, con hombros.
 * - Mientras carga se ve el fondo de la superficie 3 del tono (claro u oscuro),
 *   no un hueco blanco.
 * - Sin foto: iniciales sobre la misma superficie.
 *
 * Tamanos de referencia (plan "Protagonistas"): filas de lista 56 px, filas
 * de tabla densas 36 px, podio #2/#3 72x96 en 3:4.
 */

export const PHOTO_RADIUS = 8

interface CPPlayerPhotoProps {
  src?: string | null
  /** Nombre para el alt y las iniciales. */
  name: string
  /** Ancho en px. */
  size: number
  aspect?: 'square' | 'portrait'
  radius?: number
  /** Para la primera foto visible (LCP). */
  priority?: boolean
  className?: string
  style?: React.CSSProperties
}

export function CPPlayerPhoto({
  src,
  name,
  size,
  aspect = 'square',
  radius = PHOTO_RADIUS,
  priority,
  className,
  style,
}: CPPlayerPhotoProps) {
  const height = aspect === 'portrait' ? Math.round((size * 4) / 3) : size

  return (
    <div
      className={className}
      style={{
        width: size,
        height,
        borderRadius: radius,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        background: 'var(--cp-surface-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={height}
          preload={priority}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <span
          aria-label={name}
          style={{
            fontFamily: 'var(--cp-font-display)',
            fontWeight: 800,
            fontSize: Math.max(12, Math.round(size * 0.32)),
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  )
}

export default CPPlayerPhoto
