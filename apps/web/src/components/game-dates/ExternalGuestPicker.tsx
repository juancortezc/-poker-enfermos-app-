'use client'

/**
 * Invitados externos (rol Invitado) del selector de la fecha: los que tienen
 * nombre, por participacion mas reciente y con "invitado por X"; al final,
 * aparte, los comodines sin nombre ("Invitado 1 S/N"). Incluye el boton
 * "Nuevo invitado" con su formulario. Los miembros del grupo no pasan por aqui.
 */
import Image from 'next/image'
import { useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { fullName, groupExternalGuests, guestInviterLabel } from '@poker/shared'
import NewGuestDialog, { type PickerGuest } from './NewGuestDialog'

export type { PickerGuest }

interface Props {
  guests: PickerGuest[]
  selected: readonly string[]
  onToggle: (id: string) => void
  /** Agrega el invitado a la lista (si falta) y lo deja elegido. */
  onAddAndSelect: (guest: PickerGuest) => void
  /** Jugadores de la fecha: se ofrecen primero como invitadores. */
  playingIds?: readonly string[]
  accent?: string
}

function Avatar({ guest }: { guest: PickerGuest }) {
  const name = fullName(guest)
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--cp-surface-container)' }}>
      {guest.photoUrl ? (
        <Image src={guest.photoUrl} alt="" width={26} height={26} className="object-cover w-full h-full" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 12, fontWeight: 800 }}>{initials}</div>
      )}
    </div>
  )
}

export default function ExternalGuestPicker({ guests, selected, onToggle, onAddAndSelect, playingIds, accent = 'var(--cp-negative)' }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { named, placeholders } = groupExternalGuests(guests)

  const item = (guest: PickerGuest) => {
    const isSelected = selected.includes(guest.id)
    const sub = guestInviterLabel(guest)
    return (
      <button
        key={guest.id}
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        onClick={() => onToggle(guest.id)}
        className="flex items-center gap-1.5 transition-all"
        style={{
          minHeight: 44,
          padding: '6px 8px',
          borderRadius: 12,
          background: isSelected ? accent : 'var(--cp-background)',
          border: `1px solid ${isSelected ? accent : 'var(--cp-surface-border)'}`,
          textAlign: 'left',
        }}
      >
        <Avatar guest={guest} />
        <span className="flex-1 min-w-0">
          <span
            className="block truncate"
            style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#fff' : 'var(--cp-on-surface)' }}
          >
            {fullName(guest)}
          </span>
          {sub && (
            <span
              className="block line-clamp-2"
              style={{ fontSize: 12, lineHeight: 1.25, color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--cp-on-surface-variant)' }}
            >
              {sub}
            </span>
          )}
        </span>
        <span
          aria-hidden
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isSelected ? 'var(--cp-positive)' : 'transparent',
            border: isSelected ? 'none' : '1.5px solid var(--cp-outline)',
          }}
        >
          {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
        </span>
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full mb-3 flex items-center justify-center gap-2"
        style={{
          minHeight: 44,
          background: 'var(--cp-surface-container)',
          border: `1px solid ${accent}`,
          color: 'var(--cp-on-surface)',
          borderRadius: 'var(--cp-radius-sm)',
          fontSize: 'var(--cp-text-caption)',
          fontWeight: 700,
        }}
      >
        <UserPlus size={14} />
        Nuevo invitado
      </button>

      {named.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">{named.map(item)}</div>
      ) : (
        <p className="text-center py-3" style={{ fontSize: 'var(--cp-text-caption)', color: 'var(--cp-on-surface-muted)' }}>
          No hay invitados con nombre. Créalo con &quot;Nuevo invitado&quot;.
        </p>
      )}

      {placeholders.length > 0 && (
        <div className="mt-4">
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-on-surface-variant)', marginBottom: 8 }}>
            Sin nombre (solo si no hay otra opción)
          </p>
          <div className="grid grid-cols-2 gap-2" style={{ opacity: 0.85 }}>{placeholders.map(item)}</div>
        </div>
      )}

      <NewGuestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={onAddAndSelect}
        onPickExisting={onAddAndSelect}
        playingIds={playingIds}
      />
    </div>
  )
}
