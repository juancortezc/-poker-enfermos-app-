'use client'

import { ReactNode } from 'react'

interface CPAppShellProps {
  children: ReactNode
  /** 'light' invierte el suelo: papel de base, negro y rojo de acento. */
  tone?: 'dark' | 'light'
}

/**
 * CPAppShell - Container for CleanPoker pages
 *
 * - Mobile: Full width, native app feel
 * - Desktop: Centered container with max-width, simulating a phone frame
 */
export function CPAppShell({ children, tone = 'dark' }: CPAppShellProps) {
  const claro = tone === 'light'
  return (
    <div
      className={`min-h-screen${claro ? ' cp-light' : ''}`}
      style={claro ? {
        backgroundColor: '#FAF7F2',
        backgroundImage: `
          radial-gradient(ellipse 90% 36% at 50% 0%, rgba(229, 57, 53, 0.07) 0%, transparent 62%),
          radial-gradient(ellipse 70% 34% at 88% 96%, rgba(15, 118, 110, 0.05) 0%, transparent 58%)
        `,
        backgroundRepeat: 'no-repeat, no-repeat',
      } : {
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
