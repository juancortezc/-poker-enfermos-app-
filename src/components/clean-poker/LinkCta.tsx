'use client'

import type { CSSProperties, ReactNode } from 'react'

const BASE_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  color: '#E53935',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0
}

interface LinkCtaProps {
  onClick?: () => void
  style?: CSSProperties
  children: ReactNode
}

export function LinkCta({ onClick, style, children }: LinkCtaProps) {
  return (
    <button onClick={onClick} style={{ ...BASE_STYLE, ...style }}>
      {children}
    </button>
  )
}

export default LinkCta
