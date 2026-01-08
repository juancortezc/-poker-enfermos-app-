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
    <div className="min-h-screen" style={{ background: 'var(--cp-background)' }}>
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
