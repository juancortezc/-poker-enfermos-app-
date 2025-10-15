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

type HighlightVariant = 'gold' | 'silver' | 'bronze' | 'default'
type TrendVariant = 'up' | 'down' | 'steady'

export interface RankCardProps {
  position: number
  name: string
  alias?: string | null
  points: number | string
  trend?: TrendVariant
  meta?: string
  highlight?: HighlightVariant
  avatarUrl?: string | null
  badge?: ReactNode
  footer?: ReactNode
  actions?: ReactNode
}

const highlightStyles: Record<HighlightVariant, string> = {
  gold: 'border-[#e0b66c]/60 shadow-glow-gold',
  silver: 'border-[#d6d3cf]/45 shadow-glow-silver',
  bronze: 'border-[#b68351]/50 shadow-glow-bronze',
  default: 'border-[#e0b66c]/15 shadow-[0_18px_40px_rgba(11,6,3,0.45)]',
}

const trendConfig: Record<TrendVariant, { label: string; className: string; icon: ReactNode }> = {
  up: {
    label: 'Sube',
    className: 'text-[#7bdba5]',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  down: {
    label: 'Baja',
    className: 'text-[#f38b7d]',
    icon: <TrendingDown className="h-4 w-4" />,
  },
  steady: {
    label: 'Sin cambios',
    className: 'text-[#d7c59a]',
    icon: <Minus className="h-4 w-4" />,
  },
}

function RankCardComponent({
  position,
  name,
  alias,
  points,
  trend = 'steady',
  meta,
  highlight = 'default',
  avatarUrl,
  badge,
  footer,
  actions,
}: RankCardProps) {
  const frame = highlight !== 'default' ? frameMap[highlight] : null
  const trendInfo = trendConfig[trend]

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[20px] border bg-[rgba(24,14,10,0.92)] px-4 py-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(11,6,3,0.6)]',
        highlightStyles[highlight]
      )}
    >
      {frame && (
        <Image
          src={frame}
          alt=""
          fill
          priority={false}
          className="pointer-events-none select-none opacity-50 mix-blend-screen"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[#e0b66c]/35 bg-[#1a0f0c]/80 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e0b66c] shadow-[0_6px_16px_rgba(11,6,3,0.55)]">
            #{String(position).padStart(2, '0')}
            {badge && (
              <div className="absolute -right-1 -bottom-1">{badge}</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base tracking-[0.14em] text-[#f3e6c5] uppercase leading-tight truncate">
              {name}
            </h3>
            {alias && (
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#d7c59a]/70 mt-0.5 truncate">
                {alias}
              </p>
            )}
            {meta && (
              <p className="mt-1 text-[10px] text-[#d7c59a]/75 truncate">{meta}</p>
            )}
          </div>
        </div>

        {actions}
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[2rem] font-heading leading-none tracking-[0.16em] text-[#e0b66c]">
            {points}
          </div>
          <div className={cn('mt-1.5 flex items-center gap-1.5 text-[10px]', trendInfo.className)}>
            {trendInfo.icon}
            <span className="uppercase tracking-[0.22em]">{trendInfo.label}</span>
          </div>
        </div>

        {avatarUrl ? (
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#e0b66c]/40 bg-[#2a1a14] shadow-[0_10px_24px_rgba(11,6,3,0.55)]">
            <Image
              src={avatarUrl}
              alt={name}
              fill
              sizes="56px"
              className="object-cover noir-photo"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#e0b66c]/30 bg-[#271911] text-base font-heading uppercase tracking-[0.24em] text-[#d7c59a] shadow-[0_10px_24px_rgba(11,6,3,0.55)]">
            {name.slice(0, 2)}
          </div>
        )}
      </div>

      {footer && (
        <div className="relative mt-4 border-t border-[#e0b66c]/10 pt-3 text-[10px] uppercase tracking-[0.18em] text-[#d7c59a]/70">
          {footer}
        </div>
      )}
    </article>
  )
}

const RankCard = RankCardComponent

export { RankCard }
export default RankCard
