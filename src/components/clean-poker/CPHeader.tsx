'use client'

import Image from 'next/image'
import Link from 'next/link'

const LOGO_URL = 'https://storage.googleapis.com/poker-enfermos/logo.png'

interface CPHeaderProps {
  userInitials?: string
  userPhotoUrl?: string
  tournamentNumber?: number
  onAvatarClick?: () => void
}

export function CPHeader({ userInitials = 'PE', userPhotoUrl, tournamentNumber = 29, onAvatarClick }: CPHeaderProps) {
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
          fontFamily: 'var(--cp-font-impact)',
          fontSize: '20px',
          color: 'var(--cp-on-surface)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Torneo {tournamentNumber}
      </span>

      {/* Avatar / Menu - Right */}
      <button
        onClick={onAvatarClick}
        className="absolute right-4 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-opacity hover:opacity-80"
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
      </button>
    </header>
  )
}

export default CPHeader
