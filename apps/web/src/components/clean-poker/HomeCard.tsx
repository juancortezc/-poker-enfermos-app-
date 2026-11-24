'use client'

import type { CSSProperties, ReactNode } from 'react'

const BASE_STYLE: CSSProperties = {
  background: 'var(--cp-surface-1)',
  border: '1px solid var(--cp-surface-border)',
  borderRadius: 18,
  boxShadow: 'var(--cp-elevation-2)'
}

interface HomeCardProps {
  style?: CSSProperties
  children: ReactNode
}

/** Tarjeta gris medio-oscuro compartida por las secciones "neutras" de la nueva home/nav. */
export function HomeCard({ style, children }: HomeCardProps) {
  return <div style={{ ...BASE_STYLE, ...style }}>{children}</div>
}

export default HomeCard
