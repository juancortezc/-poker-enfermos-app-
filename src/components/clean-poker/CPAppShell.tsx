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
        backgroundColor: 'var(--cp-surface-0)',
        backgroundImage: `
          radial-gradient(ellipse 95% 40% at 50% 6%, rgba(229, 57, 53, 0.10) 0%, transparent 58%),
          radial-gradient(ellipse 75% 38% at 85% 88%, rgba(91, 200, 192, 0.05) 0%, transparent 55%),
          linear-gradient(170deg, #1D1615 0%, #221A19 55%, #271E1C 100%)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
        backgroundBlendMode: 'screen, screen, normal',
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
