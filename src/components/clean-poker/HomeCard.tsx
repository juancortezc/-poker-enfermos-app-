'use client'

import type { CSSProperties, ReactNode } from 'react'

const BASE_STYLE: CSSProperties = {
  background: '#2A292B',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 18,
  boxShadow: '0 1px 2px rgba(0,0,0,0.4), 0 10px 28px rgba(0,0,0,0.45)'
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
