'use client'

import Image from 'next/image'
import { getAvatarColor, getInitials } from '@/lib/avatar-utils'

interface HomeAvatarProps {
  playerId: string
  name: string
  photoUrl?: string | null
  size: number
  fontSize?: number
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

export function HomeAvatar({ playerId, name, photoUrl, size, fontSize }: HomeAvatarProps) {
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

  if (photoUrl) {
    return (
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
    )
  }

  return <div style={style}>{getInitials(name)}</div>
}

export default HomeAvatar
