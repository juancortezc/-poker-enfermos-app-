'use client'

/**
 * "Nuevo invitado" dentro del selector de la fecha: nombre, apellido y quien
 * lo invita. Al guardar se crea (POST /api/players/guests) y el selector lo
 * deja elegido. Si ya existe uno con ese nombre, ofrece elegir el existente.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, UserPlus, X } from 'lucide-react'
import { createGuestSchema, fullName } from '@poker/shared'
import { ApiError, apiFetch } from '@/lib/api-client'

export interface PickerGuest {
  id: string
  firstName: string
  lastName: string
  role?: string
  photoUrl?: string | null
  lastPlayedAt?: string | null
  inviter?: { id?: string; firstName: string; lastName: string } | null
}

interface Member {
  id: string
  firstName: string
  lastName: string
  role: string
  isActive?: boolean
}

type Field = 'firstName' | 'lastName' | 'inviterId'

interface Props {
  open: boolean
  onClose: () => void
  /** Invitado recien creado: el selector lo agrega y lo elige. */
  onCreated: (guest: PickerGuest) => void
  /** Ya existia uno con ese nombre y el usuario lo prefiere. */
  onPickExisting: (guest: PickerGuest) => void
  /** Jugadores elegidos para la fecha: se ofrecen primero como invitadores. */
  playingIds?: readonly string[]
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: 'var(--cp-radius-sm)',
  border: '1px solid var(--cp-surface-border)',
  background: 'var(--cp-background)',
  color: 'var(--cp-on-surface)',
  fontSize: 16,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 'var(--cp-text-caption)',
  fontWeight: 600,
  color: 'var(--cp-on-surface-muted)',
}

export default function NewGuestDialog({ open, onClose, onCreated, onPickExisting, playingIds = [] }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [inviterId, setInviterId] = useState('')
  const [members, setMembers] = useState<Member[] | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState('')
  const [existing, setExisting] = useState<PickerGuest | null>(null)
  const [saving, setSaving] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setFirstName('')
    setLastName('')
    setInviterId('')
    setErrors({})
    setFormError('')
    setExisting(null)
    setTimeout(() => firstRef.current?.focus(), 50)
    if (members === null) {
      apiFetch<Member[]>('/api/players?role=Enfermo,Comision')
        .then((list) => setMembers(list.filter((m) => m.isActive !== false)))
        .catch(() => setFormError('No se pudo cargar la lista de jugadores del grupo'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onClose])

  const { playing, others } = useMemo(() => {
    const sorted = [...(members ?? [])].sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'))
    const set = new Set(playingIds)
    return { playing: sorted.filter((m) => set.has(m.id)), others: sorted.filter((m) => !set.has(m.id)) }
  }, [members, playingIds])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setExisting(null)
    const parsed = createGuestSchema.safeParse({ firstName, lastName, inviterId })
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field
        if (!next[field]) next[field] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const guest = await apiFetch<PickerGuest>('/api/players/guests', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      })
      onCreated(guest)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_GUEST' && err.body.existingGuest) {
        setExisting(err.body.existingGuest as PickerGuest)
        setFormError(err.message)
      } else if (err instanceof ApiError && err.errors?.length) {
        const next: Partial<Record<Field, string>> = {}
        for (const d of err.errors) next[d.field as Field] = d.message
        setErrors(next)
      } else {
        setFormError(err instanceof Error ? err.message : 'No se pudo crear el invitado')
      }
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`ng-${field}-err`} role="alert" style={{ marginTop: 4, fontSize: 'var(--cp-text-micro)', color: 'var(--cp-negative)' }}>
        {errors[field]}
      </p>
    ) : null

  return (
    <div
      // Por encima de la barra inferior (BottomNav, z-50), que tapaba el boton.
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={() => !saving && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="ng-title"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: 18,
          padding: 20,
          color: 'var(--cp-on-surface)',
        }}
        noValidate
      >
        <div className="flex items-center justify-between mb-1">
          <h2
            id="ng-title"
            style={{ fontFamily: 'var(--cp-font-display)', fontWeight: 800, fontSize: 'var(--cp-text-title)', letterSpacing: '-0.01em' }}
          >
            Nuevo invitado
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, color: 'var(--cp-on-surface-muted)' }}
          >
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: 'var(--cp-text-caption)', color: 'var(--cp-on-surface-muted)', marginBottom: 16 }}>
          Con su nombre y apellido reales, para no mezclarlo con otra persona.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="ng-firstName" style={labelStyle}>Nombre</label>
            <input
              id="ng-firstName"
              ref={firstRef}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="off"
              autoCapitalize="words"
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'ng-firstName-err' : undefined}
              style={inputStyle}
            />
            {fieldError('firstName')}
          </div>
          <div>
            <label htmlFor="ng-lastName" style={labelStyle}>Apellido</label>
            <input
              id="ng-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="off"
              autoCapitalize="words"
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'ng-lastName-err' : undefined}
              style={inputStyle}
            />
            {fieldError('lastName')}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="ng-inviterId" style={labelStyle}>Invitado por</label>
          <select
            id="ng-inviterId"
            value={inviterId}
            onChange={(e) => setInviterId(e.target.value)}
            disabled={members === null}
            aria-invalid={!!errors.inviterId}
            aria-describedby={errors.inviterId ? 'ng-inviterId-err' : undefined}
            style={inputStyle}
          >
            <option value="">{members === null ? 'Cargando…' : 'Elige quién lo invita'}</option>
            {playing.length > 0 && (
              <optgroup label="Juegan esta fecha">
                {playing.map((m) => (
                  <option key={m.id} value={m.id}>{fullName(m)}</option>
                ))}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label={playing.length > 0 ? 'Resto del grupo' : 'Del grupo'}>
                {others.map((m) => (
                  <option key={m.id} value={m.id}>{fullName(m)}</option>
                ))}
              </optgroup>
            )}
          </select>
          {fieldError('inviterId')}
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-4"
            style={{
              padding: 12,
              borderRadius: 'var(--cp-radius-sm)',
              border: '1px solid var(--cp-negative)',
              fontSize: 'var(--cp-text-caption)',
              color: 'var(--cp-on-surface)',
            }}
          >
            <p>{formError}</p>
            {existing && (
              <button
                type="button"
                onClick={() => {
                  onPickExisting(existing)
                  onClose()
                }}
                className="mt-2 w-full"
                style={{
                  minHeight: 44,
                  borderRadius: 'var(--cp-radius-sm)',
                  background: 'var(--cp-surface-container)',
                  border: '1px solid var(--cp-surface-border)',
                  fontWeight: 700,
                  color: 'var(--cp-on-surface)',
                }}
              >
                Elegir a {fullName(existing)}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2"
          style={{
            minHeight: 48,
            borderRadius: 'var(--cp-radius-sm)',
            background: 'var(--cp-primary-variant)',
            color: 'var(--cp-on-primary)',
            fontFamily: 'var(--cp-font-display)',
            fontWeight: 800,
            letterSpacing: '0.02em',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {saving ? 'GUARDANDO…' : 'GUARDAR Y ELEGIR'}
        </button>
      </form>
    </div>
  )
}
