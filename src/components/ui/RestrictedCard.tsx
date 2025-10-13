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
        : 'cursor-pointer border-[#2b1209] from-[#2a1a14]/80 via-[#24160f]/80 to-[#1f1410]/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e0b66c]/60 hover:shadow-[0_12px_32px_rgba(224,182,108,0.25)]'
      }
      flex flex-col items-center justify-center gap-2.5 p-3 sm:p-4
      ${className}
    `}>
      {/* Noir Jazz texture overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#e0b66c]/5 via-transparent to-black/60" aria-hidden />

      {/* Lock overlay for restricted items */}
      {showLock && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#e0b66c]/40 bg-[#2a1a14]/90">
            <Lock className="h-2.5 w-2.5 text-[#e0b66c]/70" />
          </div>
        </div>
      )}

      <div className="relative flex items-center justify-center">
        <div className={`
          flex h-11 w-11 items-center justify-center rounded-lg border-2 sm:h-12 sm:w-12 transition-all duration-200
          ${isBlocked
            ? 'border-[#3c2219] bg-[#2a1a14]/30'
            : 'border-[#2b1209] bg-[linear-gradient(135deg,rgba(224,182,108,0.92),rgba(169,68,28,0.88))] shadow-[0_8px_20px_rgba(224,182,108,0.22)] hover:shadow-[0_10px_28px_rgba(224,182,108,0.3)]'
          }
        `}>
          <Icon className={`h-6 w-6 sm:h-6.5 sm:w-6.5 ${
            isBlocked
              ? 'text-[#d7c59a]/30'
              : 'text-[#1f1410] drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]'
          }`} />
        </div>
      </div>

      <div className="relative text-center w-full px-1">
        <h3 className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] leading-snug ${
          isBlocked ? 'text-[#d7c59a]/40' : 'text-[#f3e6c5]'
        }`}>
          {title}
        </h3>

        {/* Restriction message */}
        {showLock && userRole && feature && (
          <p className="mt-0.5 text-[9px] leading-tight text-[#d7c59a]/50">
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
