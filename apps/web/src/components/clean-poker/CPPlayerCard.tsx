'use client'

import { useState } from 'react'
import Image from 'next/image'
import { playerCardUrl } from '@poker/shared'
import { getInitials } from '@/lib/avatar-utils'
import { CPPhotoViewer } from './CPPhotoViewer'

/**
 * Tarjeta completa del jugador (estilo lucha libre del T31: marco rojo,
 * "TORNEO XXXI" arriba y el apodo abajo), para los lugares que celebran:
 * lider de la tabla, perfil, campeon. Generica: el Inicio la puede reusar.
 *
 * - La URL sale de `playerCardUrl(photoUrl, role)` (@poker/shared). Los
 *   invitados llevan la del pato.
 * - Si la foto es de una temporada sin tarjeta (`playerCardUrl` da null), cae a
 *   la foto de perfil en 3:4 con el mismo radio y sombra; sin foto, iniciales.
 * - El ANCHO lo pone quien la usa (`width`, o el contenedor con '100%'); el
 *   alto sale de la proporcion. Por eso `sizes` es obligatorio: debe decir el
 *   ancho real en pantalla ("140px", "(min-width: 640px) 240px, 60vw"), y asi
 *   el optimizador sirve la variante justa y no el original de 800x1200.
 * - `zoomable` la vuelve un boton que abre el visor a pantalla completa.
 * - Mientras carga se ve la superficie 3 del tono; sombra = elevacion 2 del
 *   tono (cambia sola entre claro y oscuro).
 */

/** Radio de la tarjeta-foto. No hay token propio en @poker/design (ver reporte). */
export const PLAYER_CARD_RADIUS = 12
export const CARD_ASPECT = 2 / 3
export const PHOTO_ASPECT = 3 / 4

interface CPPlayerCardProps {
  photoUrl?: string | null
  role?: string | null
  /** Nombre del jugador: alt, iniciales y etiqueta del boton. */
  name: string
  /** Atributo `sizes` de next/image: el ancho real que ocupa en pantalla. */
  sizes: string
  /** Ancho CSS del bloque. Por defecto llena el contenedor. */
  width?: number | string
  /** Para la tarjeta que es el LCP de la pantalla. */
  priority?: boolean
  /** Abre el visor a pantalla completa al tocarla. */
  zoomable?: boolean
  /** Sin sombra, para cuando va sobre un bloque que ya tiene la suya. */
  flat?: boolean
  className?: string
  style?: React.CSSProperties
  /** Encima de la imagen (insignias de posicion, etc.). */
  children?: React.ReactNode
}

export function CPPlayerCard({
  photoUrl,
  role,
  name,
  sizes,
  width = '100%',
  priority,
  zoomable,
  flat,
  className,
  style,
  children,
}: CPPlayerCardProps) {
  const [open, setOpen] = useState(false)
  const cardSrc = playerCardUrl(photoUrl, role)
  const src = cardSrc ?? photoUrl ?? null
  const aspectRatio = cardSrc ? CARD_ASPECT : PHOTO_ASPECT
  const alt = cardSrc ? `Tarjeta de ${name}` : name

  const frameStyle: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    width,
    aspectRatio,
    borderRadius: PLAYER_CARD_RADIUS,
    overflow: 'hidden',
    flexShrink: 0,
    background: 'var(--cp-surface-3)',
    boxShadow: flat ? undefined : 'var(--cp-elevation-2)',
    padding: 0,
    border: 'none',
    ...style,
  }

  const content = (
    <>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={priority}
          className="object-cover object-top"
        />
      ) : (
        <span
          aria-label={name}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--cp-font-display)',
            fontWeight: 800,
            fontSize: 32,
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          {getInitials(name)}
        </span>
      )}
      {children}
    </>
  )

  if (!zoomable || !src) {
    return (
      <div className={className} style={frameStyle}>
        {content}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver en grande la ${cardSrc ? 'tarjeta' : 'foto'} de ${name}`}
        aria-haspopup="dialog"
        className={`cp-photo-zoom ${className ?? ''}`}
        style={frameStyle}
      >
        {content}
      </button>
      <CPPhotoViewer open={open} onClose={() => setOpen(false)} src={src} alt={alt} aspectRatio={aspectRatio} />
    </>
  )
}

export default CPPlayerCard
