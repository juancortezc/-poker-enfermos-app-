'use client'

import { Card } from '@/components/ui/card'
import { Lock, LucideIcon } from 'lucide-react'
import { getRestrictionMessage, FeaturePermission } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

interface RestrictedCardProps {
  title: string
  icon: LucideIcon
  isRestricted?: boolean
  userRole?: UserRole
  feature?: FeaturePermission
  href?: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

export function RestrictedCard({
  title,
  icon: Icon,
  isRestricted = false,
  userRole,
  feature,
  href,
  onClick,
  className = '',
  disabled = false,
  children
}: RestrictedCardProps) {
  const isBlocked = isRestricted || disabled
  const showLock = isRestricted && userRole && feature

  const cardContent = (
    <Card className={`
      relative h-28 sm:h-32 overflow-hidden
      border-2 bg-gradient-to-br backdrop-blur-md
      ${isBlocked
        ? 'cursor-not-allowed opacity-50 border-[#3c2219] from-[#2a1a14]/30 via-[#24160f]/30 to-[#1f1410]/30'
        : 'cursor-pointer border-[#2b1209] from-[#2a1a14]/80 via-[#24160f]/80 to-[#1f1410]/80 transition-all duration-300 hover:-translate-y-1 hover:border-[#e0b66c]/60 hover:shadow-[0_18px_40px_rgba(224,182,108,0.28)]'
      }
      flex flex-col items-center justify-between p-3 sm:p-4
      ${className}
    `}>
      {/* Noir Jazz texture overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#e0b66c]/5 via-transparent to-black/60" aria-hidden />

      {/* Lock overlay for restricted items */}
      {showLock && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#e0b66c]/40 bg-[#2a1a14]/90">
            <Lock className="h-3 w-3 text-[#e0b66c]/70" />
          </div>
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center">
        <div className={`
          flex h-12 w-12 items-center justify-center rounded-xl border-2 sm:h-14 sm:w-14 transition-all duration-200
          ${isBlocked
            ? 'border-[#3c2219] bg-[#2a1a14]/30'
            : 'border-[#2b1209] bg-[linear-gradient(135deg,rgba(224,182,108,0.92),rgba(169,68,28,0.88))] shadow-[0_18px_40px_rgba(224,182,108,0.28)] hover:shadow-[0_22px_50px_rgba(224,182,108,0.35)]'
          }
        `}>
          <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${
            isBlocked
              ? 'text-[#d7c59a]/30'
              : 'text-[#1f1410] drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
          }`} />
        </div>
      </div>

      <div className="relative text-center">
        <h3 className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] ${
          isBlocked ? 'text-[#d7c59a]/40' : 'text-[#f3e6c5]'
        }`}>
          {title}
        </h3>

        {/* Restriction message */}
        {showLock && userRole && feature && (
          <p className="mt-1 text-[10px] leading-tight text-[#d7c59a]/50">
            {getRestrictionMessage(userRole, feature)}
          </p>
        )}
      </div>

      {children}
    </Card>
  )

  // If restricted or disabled, return non-interactive card
  if (isBlocked) {
    return (
      <div title={showLock && userRole && feature ? getRestrictionMessage(userRole, feature) : undefined}>
        {cardContent}
      </div>
    )
  }

  // If has onClick handler, return button
  if (onClick) {
    return (
      <button onClick={onClick} className="w-full">
        {cardContent}
      </button>
    )
  }

  // If has href, wrap in link (handled by parent)
  return cardContent
}

/**
 * Variant specifically for admin dashboard cards
 */
export function AdminCard({
  title,
  icon,
  accessible: _accessible, // Prefix with underscore to indicate intentionally unused
  restricted,
  href,
  userRole,
  feature,
  index,
  ...props
}: {
  title: string
  icon: LucideIcon
  accessible: boolean
  restricted: boolean
  href?: string
  userRole?: UserRole
  feature?: FeaturePermission
  index?: number
} & Omit<RestrictedCardProps, 'title' | 'icon' | 'isRestricted'>) {
  return (
    <RestrictedCard
      title={title}
      icon={icon}
      isRestricted={restricted}
      userRole={userRole}
      feature={feature}
      href={href}
      className={`
        admin-card
        ${index !== undefined ? `animate-stagger animate-stagger-${index + 1}` : ''}
      `}
      {...props}
    />
  )
}
