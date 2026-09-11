'use client'

import Image from 'next/image'
import { getAvatarColor, getInitials } from '@/lib/avatar-utils'

interface HomeAvatarProps {
  playerId: string
  name: string
  photoUrl?: string | null
  size: number
  fontSize?: number
  /** Circular en vez de cuadrado redondeado. Lo usa el podio, donde el circulo
   *  es lo que rompe la cuadricula de la pantalla. */
  round?: boolean
}

export function HomeAvatar({ playerId, name, photoUrl, size, fontSize, round = false }: HomeAvatarProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: round ? '50%' : 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    color: '#fff',
    flexShrink: 0,
    overflow: 'hidden',
    fontSize: fontSize ?? Math.round(size * 0.34),
    background: photoUrl ? undefined : getAvatarColor(playerId)
  }

  if (photoUrl) {
    return (
      <div style={style}>
        <Image src={photoUrl} alt={name} width={size} height={size} className="w-full h-full object-cover" unoptimized />
      </div>
    )
  }

  return <div style={style}>{getInitials(name)}</div>
}

export default HomeAvatar
