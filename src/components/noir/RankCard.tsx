'use client'

import Image from 'next/image'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

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
  badge?: React.ReactNode
  footer?: React.ReactNode
  actions?: React.ReactNode
}

const highlightStyles: Record<HighlightVariant, string> = {
  gold: 'border-[#e0b66c]/60 shadow-glow-gold',
  silver: 'border-[#d6d3cf]/45 shadow-glow-silver',
  bronze: 'border-[#b68351]/50 shadow-glow-bronze',
  default: 'border-[#e0b66c]/15 shadow-[0_18px_40px_rgba(11,6,3,0.45)]',
}

const trendConfig: Record<TrendVariant, { label: string; className: string; icon: React.ReactNode }> = {
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

export function RankCard({
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
        'relative overflow-hidden rounded-[24px] border bg-[rgba(24,14,10,0.92)] px-5 py-5 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1',
        highlightStyles[highlight]
      )}
    >
      {frame && (
        <Image
          src={frame}
          alt=""
          fill
          priority={false}
          className="pointer-events-none select-none opacity-60 mix-blend-screen"
        />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#e0b66c]/35 bg-[#1a0f0c]/80 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#e0b66c] shadow-[0_8px_18px_rgba(11,6,3,0.55)]">
            #{String(position).padStart(2, '0')}
            {badge && (
              <div className="absolute -right-1 -bottom-1">{badge}</div>
            )}
          </div>

          <div>
            <h3 className="font-heading text-lg tracking-[0.14em] text-[#f3e6c5] uppercase">
              {name}
            </h3>
            {alias && (
              <p className="text-xs uppercase tracking-[0.24em] text-[#d7c59a]/70">
                {alias}
              </p>
            )}
            {meta && (
              <p className="mt-1 text-[11px] text-[#d7c59a]/75">{meta}</p>
            )}
          </div>
        </div>

        {actions}
      </div>

      <div className="relative mt-6 flex items-end justify-between">
        <div>
          <div className="text-[2.25rem] font-heading leading-none tracking-[0.16em] text-[#e0b66c]">
            {points}
          </div>
          <div className={cn('mt-2 flex items-center gap-1.5 text-[11px]', trendInfo.className)}>
            {trendInfo.icon}
            <span className="uppercase tracking-[0.22em]">{trendInfo.label}</span>
          </div>
        </div>

        {avatarUrl ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[#e0b66c]/35 bg-[#2a1a14] shadow-[0_12px_28px_rgba(11,6,3,0.55)]">
            <Image
              src={avatarUrl}
              alt={name}
              fill
              sizes="64px"
              className="object-cover noir-photo"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#e0b66c]/25 bg-[#271911] text-lg font-heading uppercase tracking-[0.24em] text-[#d7c59a] shadow-[0_12px_28px_rgba(11,6,3,0.55)]">
            {name.slice(0, 2)}
          </div>
        )}
      </div>

      {footer && (
        <div className="relative mt-5 border-t border-[#e0b66c]/10 pt-4 text-[11px] uppercase tracking-[0.18em] text-[#d7c59a]/70">
          {footer}
        </div>
      )}
    </article>
  )
}
