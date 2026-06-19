'use client'

import { ReactNode } from 'react'

interface CPAppShellProps {
  children: ReactNode
}

/**
 * CPAppShell - Container for CleanPoker pages
 *
 * - Mobile: Full width, native app feel
 * - Desktop: Centered container with max-width, simulating a phone frame
 */
export function CPAppShell({ children }: CPAppShellProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#1e0c14',
        backgroundImage: `
          url('/textures/noise.png'),
          radial-gradient(ellipse 90% 45% at 50% 20%, rgba(200, 20, 60, 0.28) 0%, transparent 65%),
          radial-gradient(ellipse 70% 35% at 15% 55%, rgba(160, 15, 45, 0.18) 0%, transparent 60%),
          radial-gradient(ellipse 55% 30% at 85% 65%, rgba(180, 18, 52, 0.16) 0%, transparent 55%),
          radial-gradient(ellipse 80% 40% at 50% 85%, rgba(140, 12, 38, 0.20) 0%, transparent 60%),
          linear-gradient(170deg, #1e0c14 0%, #260e1a 30%, #2e1020 60%, #38142a 100%)
        `,
        backgroundSize: '180px 180px, 100% 100%, 70% 80%, 60% 60%, 80% 50%, 100% 100%',
        backgroundRepeat: 'repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat',
        backgroundBlendMode: 'soft-light, normal, normal, normal, normal, normal',
      }}
    >
      {/* Desktop: Center the app in a phone-like container */}
      <div className="mx-auto w-full max-w-md min-h-screen relative">
        {/* Subtle border on desktop to frame the app */}
        <div
          className="hidden md:block absolute inset-y-0 -left-px w-px"
          style={{ background: 'var(--cp-surface-border)' }}
        />
        <div
          className="hidden md:block absolute inset-y-0 -right-px w-px"
          style={{ background: 'var(--cp-surface-border)' }}
        />

        {children}
      </div>
    </div>
  )
}

export default CPAppShell
