'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Settings, ClipboardList } from 'lucide-react'

const LOGO_URL = 'https://storage.googleapis.com/poker-enfermos/logo.png'

interface CPHeaderProps {
  userInitials?: string
  userPhotoUrl?: string
  tournamentNumber?: number
  isComision?: boolean
  hasActiveGameDate?: boolean
  onAvatarClick?: () => void
}

export function CPHeader({
  userInitials = 'PE',
  userPhotoUrl,
  tournamentNumber = 29,
  isComision = false,
  hasActiveGameDate = false
}: CPHeaderProps) {
  return (
    <header
      className="relative flex items-center justify-center px-4 py-3 overflow-hidden"
      style={{
        borderBottom: '1px solid rgba(220, 40, 80, 0.18)',
        background: 'linear-gradient(180deg, rgba(40,10,18,0.70) 0%, transparent 100%)',
      }}
    >
      {/* Ghost "30" watermark */}
      <span
        aria-hidden
        style={{
          position: 'absolute', right: '-4px', top: '50%',
          transform: 'translateY(-52%)', fontSize: '80px', fontWeight: 900,
          color: 'rgba(220,40,60,0.065)', letterSpacing: '-0.04em', lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none',
        }}
      >
        {tournamentNumber}
      </span>

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
      <div className="flex flex-col items-center" style={{ gap: '2px' }}>
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#E53935', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Torneo
          </span>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1 }}>
            {tournamentNumber}
          </span>
        </div>
        <div style={{ height: '2px', width: '32px', background: 'linear-gradient(90deg, transparent, #E53935, transparent)' }} />
      </div>

      {/* Right side - Registro + Admin button (Comision only) + Avatar */}
      <div className="absolute right-4 flex items-center gap-2">
        {/* Registro Button - Only for Comision when game date is active */}
        {isComision && hasActiveGameDate && (
          <Link
            href="/registro"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{
              background: 'rgba(249, 115, 22, 0.15)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
            }}
          >
            <ClipboardList
              size={16}
              style={{ color: '#f97316' }}
            />
          </Link>
        )}

        {/* Admin Button - Only for Comision */}
        {isComision && (
          <Link
            href="/admin"
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
          href="/perfil"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.55)" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </Link>
      </div>
    </header>
  )
}

export default CPHeader
