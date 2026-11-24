'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

interface QuickAccessItem {
  icon: ReactNode
  label: string
  href: string
}

interface QuickAccessGridProps {
  items: QuickAccessItem[]
}

export function QuickAccessGrid({ items }: QuickAccessGridProps) {
  return (
    <div>
      <p
        className="text-[var(--cp-label-large)] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--cp-on-surface-variant)' }}
      >
        Accesos Rápidos
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--cp-radius-md)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--cp-surface-container)',
              border: '1px solid var(--cp-outline-variant)'
            }}
          >
            <span style={{ color: 'var(--cp-on-surface-variant)' }}>
              {item.icon}
            </span>
            <span
              className="text-[var(--cp-label-large)] font-medium"
              style={{ color: 'var(--cp-on-surface)' }}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default QuickAccessGrid
