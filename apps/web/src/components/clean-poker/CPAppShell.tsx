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
        // Negro plano. Antes habia un degradado de tres paradas mas dos
        // resplandores radiales encima; sumados a los rellenos de cada bloque
        // la pantalla tenia media docena de superficies distintas y se veia
        // sucia. El negro deja que los tres colores que quedan —blanco, ambar
        // y rojo— sean lo unico que se ve, y de noche en la mesa descansa.
        backgroundColor: '#000000',
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
