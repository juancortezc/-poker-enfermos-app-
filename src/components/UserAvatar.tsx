'use client'

import Image from 'next/image'

interface UserAvatarProps {
  user: {
    firstName: string
    lastName: string
    photoUrl?: string
  }
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg', 
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-4xl'
  }

  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${className}`

  if (user.photoUrl) {
    return (
      <div className={`${baseClasses} relative overflow-hidden`}>
        <Image
          src={user.photoUrl}
          alt={`${user.firstName} ${user.lastName}`}
          fill
          className="object-cover"
          sizes={size === 'xl' ? '128px' : size === 'lg' ? '96px' : size === 'md' ? '48px' : '32px'}
        />
      </div>
    )
  }

  return (
    <div className={`${baseClasses} bg-poker-red text-white`}>
      {initials}
    </div>
  )
}