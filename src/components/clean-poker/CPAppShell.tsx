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
    <div className="min-h-screen" style={{
      background: `
        radial-gradient(ellipse 100% 35% at 50% 0%, rgba(180, 20, 60, 0.18) 0%, transparent 70%),
        radial-gradient(ellipse 60% 20% at 80% 85%, rgba(200, 30, 90, 0.08) 0%, transparent 60%),
        linear-gradient(180deg, #0c0208 0%, #080006 50%, #050004 100%)
      `
    }}>
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
