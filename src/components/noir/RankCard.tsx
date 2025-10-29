'use client'

import Image from 'next/image'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const frameMap = {
  gold: '/svgs/frame-gold-800x800.svg',
  silver: '/svgs/frame-silver-800x800.svg',
  bronze: '/svgs/frame-copper-800x800.svg',
} as const

type HighlightVariant = 'gold' | 'silver' | 'bronze' | 'pink' | 'default'
type TrendVariant = 'up' | 'down' | 'steady'

export interface RankCardProps {
  position: number
  name: string
  alias?: string | null
  points: number | string
  trend?: TrendVariant
  positionsChanged?: number
  meta?: string
  highlight?: HighlightVariant
  avatarUrl?: string | null
  badge?: ReactNode
  footer?: ReactNode
  actions?: ReactNode
}

const highlightStyles: Record<HighlightVariant, string> = {
  gold: 'border-[#e0b66c]/60 shadow-glow-gold bg-gradient-to-br from-[#e0b66c]/5 to-transparent',
  silver: 'border-[#d6d3cf]/50 shadow-glow-silver bg-gradient-to-br from-[#d6d3cf]/5 to-transparent',
  bronze: 'border-[#b68351]/50 shadow-glow-bronze bg-gradient-to-br from-[#b68351]/5 to-transparent',
  pink: 'border-[#ec4899]/55 shadow-glow-pink bg-gradient-to-br from-[#ec4899]/10 to-[#f472b6]/5',
  default: 'border-[#e0b66c]/15 shadow-[0_18px_40px_rgba(11,6,3,0.45)] bg-[rgba(24,14,10,0.92)]',
}

const trendConfig: Record<TrendVariant, { className: string; icon: ReactNode }> = {
  up: {
    className: 'text-[#7bdba5]',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  down: {
    className: 'text-[#f38b7d]',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  steady: {
    className: 'text-[#d7c59a]',
    icon: <Minus className="h-3.5 w-3.5" />,
  },
}

// Helper para formatear el label de tendencia
function getTrendLabel(trend: TrendVariant, positionsChanged: number = 0): string {
  if (trend === 'steady' || positionsChanged === 0) {
    return 'Sin cambios';
  }
  const absChange = Math.abs(positionsChanged);
  return `${absChange}`;
}

function RankCardComponent({
  position,
  name,
  alias,
  points,
  trend = 'steady',
  positionsChanged = 0,
  meta,
  highlight = 'default',
  avatarUrl,
  badge,
  footer,
  actions,
}: RankCardProps) {
  const frame = highlight !== 'default' ? frameMap[highlight] : null
  const trendInfo = trendConfig[trend]
  const trendLabel = getTrendLabel(trend, positionsChanged)

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(11,6,3,0.7)]',
        highlightStyles[highlight]
      )}
    >
      {frame && (
        <Image
          src={frame}
          alt=""
          fill
          priority={false}
          className="pointer-events-none select-none opacity-40 mix-blend-screen"
        />
      )}

      {/* Mobile-First Layout: Foto grande arriba */}
      <div className="relative p-4">
        {/* Header: Badge + Nombre */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#e0b66c]/40 bg-[#1a0f0c]/90 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e0b66c] shadow-lg">
            #{String(position).padStart(2, '0')}
            {badge && (
              <div className="absolute -right-1 -bottom-1">{badge}</div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-heading text-base tracking-[0.16em] text-[#f3e6c5] uppercase leading-tight truncate">
              {name}
            </h3>
            {alias && (
              <p className="text-[9px] uppercase tracking-[0.26em] text-[#d7c59a]/70 mt-1 truncate">
                {alias}
              </p>
            )}
          </div>

          {actions}
        </div>

        {/* Foto Grande (Principal) */}
        <div className="relative mx-auto mb-4">
          {avatarUrl ? (
            <div className={cn(
              "relative h-32 w-32 mx-auto overflow-hidden rounded-full border-3 bg-[#2a1a14] shadow-[0_16px_40px_rgba(11,6,3,0.65)]",
              highlight === 'gold' && 'border-[#e0b66c]/60',
              highlight === 'silver' && 'border-[#d6d3cf]/60',
              highlight === 'bronze' && 'border-[#b68351]/55',
              highlight === 'pink' && 'border-[#ec4899]/70',
              highlight === 'default' && 'border-[#e0b66c]/35'
            )}>
              <Image
                src={avatarUrl}
                alt={name}
                fill
                sizes="128px"
                className="object-cover noir-photo"
                priority={position <= 3}
              />
            </div>
          ) : (
            <div className={cn(
              "flex h-32 w-32 mx-auto items-center justify-center rounded-full border-3 bg-[#271911] text-3xl font-heading uppercase tracking-[0.24em] text-[#d7c59a] shadow-[0_16px_40px_rgba(11,6,3,0.65)]",
              highlight === 'gold' && 'border-[#e0b66c]/60',
              highlight === 'silver' && 'border-[#d6d3cf]/60',
              highlight === 'bronze' && 'border-[#b68351]/55',
              highlight === 'pink' && 'border-[#ec4899]/70',
              highlight === 'default' && 'border-[#e0b66c]/35'
            )}>
              {name.slice(0, 2)}
            </div>
          )}
        </div>

        {/* Puntos y Trend */}
        <div className="text-center mb-3">
          <div className="text-[2.5rem] font-heading leading-none tracking-[0.14em] text-[#e0b66c] mb-2">
            {points}
          </div>
          <div className={cn('inline-flex items-center gap-1.5 text-[10px]', trendInfo.className)}>
            {trendInfo.icon}
            <span className="uppercase tracking-[0.22em]">{trendLabel}</span>
          </div>
        </div>

        {/* Meta Info */}
        {meta && (
          <p className="text-center text-[10px] text-[#d7c59a]/75 mb-3">{meta}</p>
        )}

        {/* Footer */}
        {footer && (
          <div className="border-t border-[#e0b66c]/15 pt-3 text-center text-[10px] uppercase tracking-[0.18em] text-[#d7c59a]/70">
            {footer}
          </div>
        )}
      </div>
    </article>
  )
}

const RankCard = RankCardComponent

export { RankCard }
export default RankCard
