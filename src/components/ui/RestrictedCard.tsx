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
      h-32 relative
      ${isBlocked 
        ? 'opacity-60 cursor-not-allowed' 
        : 'cursor-pointer hover:scale-105'
      }
      flex flex-col items-center justify-center p-4
      transition-all duration-300
      ${className}
    `}>
      {/* Lock overlay for restricted items */}
      {showLock && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
            <Lock className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div className={`
          w-14 h-14 flex items-center justify-center rounded-xl
          ${isBlocked 
            ? 'bg-gray-700/50' 
            : 'bg-poker-red'
          }
          shadow-inner
        `}>
          <Icon className={`w-7 h-7 ${
            isBlocked 
              ? 'text-gray-500' 
              : 'text-white drop-shadow-lg'
          }`} />
        </div>
      </div>
      
      <div className="text-center">
        <h3 className={`text-sm font-semibold tracking-wide ${
          isBlocked ? 'text-gray-500' : 'text-white'
        }`}>
          {title}
        </h3>
        
        {/* Restriction message */}
        {showLock && userRole && feature && (
          <p className="text-xs text-gray-400 mt-1 leading-tight">
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