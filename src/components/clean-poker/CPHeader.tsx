'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Settings } from 'lucide-react'

const LOGO_URL = 'https://storage.googleapis.com/poker-enfermos/logo.png'

interface CPHeaderProps {
  userInitials?: string
  userPhotoUrl?: string
  tournamentNumber?: number
  isComision?: boolean
  onAvatarClick?: () => void
}

export function CPHeader({
  userInitials = 'PE',
  userPhotoUrl,
  tournamentNumber = 29,
  isComision = false
}: CPHeaderProps) {
  return (
    <header className="relative flex items-center justify-center px-4 py-3">
      {/* Logo - Left */}
      <Link href="/" className="absolute left-4">
        <Image
          src={LOGO_URL}
          alt="Poker Enfermos"
          width={36}
          height={36}
          className="rounded-full"
        />
      </Link>

      {/* Tournament Title - Center */}
      <span
        style={{
          fontFamily: 'var(--cp-font)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--cp-on-surface)',
          letterSpacing: '0.02em',
        }}
      >
        Torneo {tournamentNumber}
      </span>

      {/* Right side - Admin button (Comision only) + Avatar */}
      <div className="absolute right-4 flex items-center gap-2">
        {/* Admin Button - Only for Comision */}
        {isComision && (
          <Link
            href="/admin-new"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{
              background: 'rgba(229, 57, 53, 0.15)',
              border: '1px solid rgba(229, 57, 53, 0.3)',
            }}
          >
            <Settings
              size={16}
              style={{ color: '#E53935' }}
            />
          </Link>
        )}

        {/* Avatar / Menu - Links to Profile */}
        <Link
          href="/perfil-new"
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-opacity hover:opacity-80"
          style={{
            background: userPhotoUrl ? 'transparent' : 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          {userPhotoUrl ? (
            <Image
              src={userPhotoUrl}
              alt="Avatar"
              width={36}
              height={36}
              className="object-cover"
            />
          ) : (
            <span
              className="font-semibold"
              style={{
                fontSize: 'var(--cp-label-size)',
                color: 'var(--cp-on-surface-medium)',
              }}
            >
              {userInitials}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}

export default CPHeader
