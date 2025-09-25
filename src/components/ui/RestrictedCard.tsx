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
      border-white/10 bg-white/5 backdrop-blur-md
      ${isBlocked
        ? 'cursor-not-allowed opacity-70'
        : 'cursor-pointer transition-transform hover:-translate-y-1 hover:border-poker-red/40 hover:shadow-[0_18px_45px_rgba(229,9,20,0.18)]'
      }
      flex flex-col items-center justify-between p-3 sm:p-4
      transition-all duration-300 ease-out
      ${className}
    `}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-black/60" aria-hidden />
      {/* Lock overlay for restricted items */}
      {showLock && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
            <Lock className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center">
        <div className={`
          flex h-12 w-12 items-center justify-center rounded-xl sm:h-14 sm:w-14
          ${isBlocked
            ? 'bg-gray-700/60'
            : 'bg-gradient-to-br from-poker-red to-poker-orange shadow-[0_0_18px_rgba(229,9,20,0.35)]'
          }
        `}>
          <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${
            isBlocked
              ? 'text-gray-500'
              : 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
          }`} />
        </div>
      </div>
      
      <div className="relative text-center">
        <h3 className={`text-xs sm:text-sm font-semibold tracking-wide ${
          isBlocked ? 'text-gray-500' : 'text-white'
        }`}>
          {title}
        </h3>
        
        {/* Restriction message */}
        {showLock && userRole && feature && (
          <p className="mt-1 text-[10px] leading-tight text-gray-400">
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
