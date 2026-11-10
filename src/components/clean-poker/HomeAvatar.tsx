'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getAvatarColor, getInitials } from '@/lib/avatar-utils'

interface HomeAvatarProps {
  playerId: string
  name: string
  photoUrl?: string | null
  size: number
  fontSize?: number
  /**
   * Hace que la foto abra el perfil de ESTE jugador. Va opt-in y no por
   * defecto porque el mismo avatar se usa en pantallas donde ya estas en ese
   * perfil (o donde la fila entera ya navega), y dos destinos encimados en el
   * mismo toque es peor que ninguno.
   */
  linkToProfile?: boolean
}

/**
 * Foto cuadrada, sin anillo. La mascara circular recortaba orejas y pelo, que
 * es por donde uno reconoce a la gente, y ademas obligaba a dejar aire
 * alrededor.
 *
 * El tamano lo decide QUIEN llama: en el home las caras se miran y van
 * grandes; en tablas y listas manda el nombre con inicial de apellido y la
 * foto es solo apoyo, asi que ahi se queda chica.
 */
const RADIUS = 8

export function HomeAvatar({ playerId, name, photoUrl, size, fontSize, linkToProfile }: HomeAvatarProps) {
  const px = size

  const style: React.CSSProperties = {
    width: px,
    height: px,
    borderRadius: RADIUS,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    color: '#fff',
    flexShrink: 0,
    overflow: 'hidden',
    fontSize: fontSize ?? Math.round(px * 0.34),
    background: photoUrl ? undefined : getAvatarColor(playerId)
  }

  const cara = photoUrl ? (
    <div style={style}>
      <Image
        src={photoUrl}
        alt={name}
        width={px}
        height={px}
        className="w-full h-full object-cover object-top"
        unoptimized
      />
    </div>
  ) : (
    <div style={style}>{getInitials(name)}</div>
  )

  if (!linkToProfile) return cara

  /*
   * El area tocable es la foto COMPLETA, no un icono encima: en el celular es
   * lo unico que se acierta con el pulgar. verticalAlign y lineHeight en 0
   * porque un inline-flex se apoya en la linea de texto y agregaba unos pixeles
   * de aire debajo — el enlace no debe mover nada del diseno.
   */
  return (
    <Link
      href={`/players/${playerId}`}
      className="cp-foto-link"
      aria-label={`Ver el perfil de ${name}`}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        borderRadius: RADIUS,
        lineHeight: 0,
        verticalAlign: 'bottom'
      }}
    >
      {cara}
    </Link>
  )
}

export default HomeAvatar
