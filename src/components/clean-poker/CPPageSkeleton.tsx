'use client'

import Image from 'next/image'
import { CPBottomNav } from './CPBottomNav'
import { CPAppShell } from './CPAppShell'

const LOGO_URL = 'https://storage.googleapis.com/poker-enfermos/logo.png'

interface CPPageSkeletonProps {
  /** Alturas de los bloques a simular, de arriba abajo. */
  blocks?: number[]
  /** Texto para lectores de pantalla. */
  label?: string
}

/**
 * Estado de carga de una pantalla completa.
 *
 * Reemplaza al spinner centrado que apagaba la página entera: el armazón
 * —cabecera y navegación— no depende de ningún dato, así que se pinta de
 * inmediato y el usuario puede seguir navegando mientras llega el contenido.
 * Solo los bloques que esperan datos se muestran como esqueleto.
 *
 * La cabecera va en versión neutra a propósito: mostrar "Torneo 29" por
 * defecto y cambiarlo a 30 medio segundo después se lee como un error.
 */
export function CPPageSkeleton({ blocks = [120, 64, 64, 64], label = 'Cargando' }: CPPageSkeletonProps) {
  return (
    <CPAppShell>
      <header
        className="relative flex items-center justify-center px-4 py-3 overflow-hidden"
        style={{
          borderBottom: '1px solid var(--cp-surface-border)',
          background: 'linear-gradient(180deg, rgba(43,33,32,0.85) 0%, transparent 100%)',
        }}
      >
        <div className="absolute left-4">
          <Image src={LOGO_URL} alt="Poker Enfermos" width={36} height={36} className="rounded-full" priority />
        </div>
        <div className="flex flex-col items-center" style={{ gap: 2 }}>
          <div
            className="cp-skeleton"
            style={{ width: 96, height: 22, borderRadius: 6 }}
          />
          <div style={{ height: 2, width: 32, background: 'linear-gradient(90deg, transparent, #E53935, transparent)' }} />
        </div>
        <div className="absolute right-4">
          <div className="cp-skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        </div>
      </header>

      <main className="pb-20 px-4 pt-4 space-y-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">{label}</span>
        {blocks.map((h, i) => (
          <div key={i} className="cp-skeleton" style={{ height: h, borderRadius: 18 }} />
        ))}
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}

export default CPPageSkeleton
