'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'
import { X, Loader2, Plus, Minus, ChevronDown, User, Shield, Phone, Mail, Cake, Link2, Hash } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  aliases: string[]
  pin?: string
  birthDate?: string
  phone?: string
  email?: string
  photoUrl?: string
  isActive: boolean
  inviter?: {
    id: string
    firstName: string
    lastName: string
  }
}

interface CPPlayerFormProps {
  player?: Player | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  defaultRole?: UserRole
}

interface FormData {
  firstName: string
  lastName: string
  role: UserRole
  aliases: string[]
  pin: string
  birthDate: string
  phone: string
  email: string
  photoUrl: string
  inviterId: string
}

export default function CPPlayerForm({
  player,
  isOpen,
  onClose,
  onSave,
  defaultRole = UserRole.Enfermo
}: CPPlayerFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    role: defaultRole,
    aliases: [''],
    pin: '',
    birthDate: '',
    phone: '',
    email: '',
    photoUrl: '',
    inviterId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enfermos, setEnfermos] = useState<Player[]>([])

  useEffect(() => {
    if (player) {
      setFormData({
        firstName: player.firstName,
        lastName: player.lastName,
        role: player.role,
        aliases: player.aliases.length > 0 ? player.aliases : [''],
        pin: player.pin ? '****' : '',
        birthDate: player.birthDate || '',
        phone: player.phone || '',
        email: player.email || '',
        photoUrl: player.photoUrl || '',
        inviterId: player.inviter?.id || ''
      })
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        role: defaultRole,
        aliases: [''],
        pin: '',
        birthDate: '',
        phone: '',
        email: '',
        photoUrl: '',
        inviterId: ''
      })
    }
  }, [player, defaultRole])

  useEffect(() => {
    fetchEnfermos()
  }, [])

  const fetchEnfermos = async () => {
    try {
      const response = await fetch('/api/players?role=Enfermo', {
        headers: buildAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setEnfermos(data.filter((p: Player) => p.role === UserRole.Enfermo || p.role === UserRole.Comision))
      }
    } catch (error) {
      console.error('Error fetching enfermos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('Nombre y apellido son obligatorios')
      }

      if (formData.pin && formData.pin !== '****' && !/^\d{4}$/.test(formData.pin)) {
        throw new Error('El PIN debe ser de 4 digitos')
      }

      if (formData.role === UserRole.Invitado && !formData.inviterId) {
        throw new Error('Los invitados deben tener un Enfermo que los invite')
      }

      const cleanAliases = formData.aliases.filter(alias => alias.trim())

      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        aliases: cleanAliases,
        pin: formData.pin && formData.pin !== '****' ? formData.pin : undefined,
        birthDate: formData.birthDate || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        photoUrl: formData.photoUrl || undefined,
        inviterId: formData.role === UserRole.Invitado ? formData.inviterId : undefined
      }

      const url = player ? `/api/players/${player.id}` : '/api/players'
      const method = player ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar jugador')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: string | UserRole | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addAlias = () => {
    setFormData(prev => ({ ...prev, aliases: [...prev.aliases, ''] }))
  }

  const removeAlias = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.filter((_, i) => i !== index)
    }))
  }

  const updateAlias = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.map((alias, i) => i === index ? value : alias)
    }))
  }

  if (!isOpen) return null

  const inputBaseStyle = {
    background: 'var(--cp-background)',
    border: '1px solid var(--cp-surface-border)',
    color: 'var(--cp-on-surface)',
    fontSize: 'var(--cp-body-size)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: 'var(--cp-background)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between"
          style={{
            background: 'var(--cp-background)',
            borderBottom: '1px solid var(--cp-surface-border)',
          }}
        >
          <h2
            className="font-semibold"
            style={{ fontSize: '18px', color: 'var(--cp-on-surface)' }}
          >
            {player ? 'Editar Jugador' : 'Nuevo Jugador'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* CleanForm: Datos Basicos Card */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
            }}
          >
            <p
              className="font-medium uppercase tracking-wider"
              style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
            >
              Datos Basicos
            </p>

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Nombre *"
                  required
                  className="flex-1 px-3 py-2.5"
                  style={{ ...inputBaseStyle, borderRadius: '4px' }}
                />
              </div>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateFormData('lastName', e.target.value)}
                placeholder="Apellido *"
                required
                className="px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Rol */}
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <div className="relative flex-1">
                <select
                  value={formData.role}
                  onChange={(e) => updateFormData('role', e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 pr-10 appearance-none"
                  style={{ ...inputBaseStyle, borderRadius: '4px' }}
                >
                  <option value={UserRole.Enfermo}>Enfermo</option>
                  <option value={UserRole.Comision}>Comision</option>
                  <option value={UserRole.Invitado}>Invitado</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--cp-on-surface-muted)' }}
                />
              </div>
            </div>

            {/* Invitador (solo para invitados) */}
            {formData.role === UserRole.Invitado && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 flex-shrink-0" style={{ color: '#EC407A' }} />
                <div className="relative flex-1">
                  <select
                    value={formData.inviterId}
                    onChange={(e) => updateFormData('inviterId', e.target.value)}
                    required
                    className="w-full px-3 py-2.5 pr-10 appearance-none"
                    style={{ ...inputBaseStyle, borderRadius: '4px' }}
                  >
                    <option value="">Invitado por... *</option>
                    {enfermos.map((enfermo) => (
                      <option key={enfermo.id} value={enfermo.id}>
                        {enfermo.firstName} {enfermo.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--cp-on-surface-muted)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* CleanForm: PIN Card */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
            }}
          >
            <p
              className="font-medium uppercase tracking-wider"
              style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
            >
              PIN de Acceso
            </p>
            <p
              style={{ fontSize: '11px', color: 'var(--cp-on-surface-muted)', marginTop: '-4px' }}
            >
              {player ? 'Deja en blanco para mantener el actual' : '4 digitos para ingresar a la app'}
            </p>

            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="text"
                maxLength={4}
                value={formData.pin}
                placeholder={player?.pin ? '****' : '1234'}
                onFocus={() => {
                  if (formData.pin === '****') updateFormData('pin', '')
                }}
                onChange={(e) => updateFormData('pin', e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* CleanForm: Aliases Card */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
            }}
          >
            <p
              className="font-medium uppercase tracking-wider"
              style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
            >
              Aliases / Apodos
            </p>

            <div className="space-y-2">
              {formData.aliases.map((alias, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => updateAlias(index, e.target.value)}
                    placeholder={`Alias ${index + 1}`}
                    className="flex-1 px-3 py-2.5"
                    style={{ ...inputBaseStyle, borderRadius: '4px' }}
                  />
                  {formData.aliases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAlias(index)}
                      className="p-2 shrink-0 transition-colors hover:bg-red-500/20"
                      style={{
                        background: 'rgba(229, 57, 53, 0.1)',
                        color: '#E53935',
                        borderRadius: '4px',
                      }}
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAlias}
                className="flex items-center gap-2 py-1.5 px-2 transition-colors hover:bg-white/5"
                style={{
                  color: '#E53935',
                  fontSize: 'var(--cp-caption-size)',
                  borderRadius: '4px',
                }}
              >
                <Plus size={14} />
                Agregar alias
              </button>
            </div>
          </div>

          {/* CleanForm: Contacto Card */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
            }}
          >
            <p
              className="font-medium uppercase tracking-wider"
              style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
            >
              Datos de Contacto
            </p>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="Celular"
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="Email"
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Birthday */}
            <div className="flex items-center gap-2">
              <Cake className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateFormData('birthDate', e.target.value)}
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Photo URL */}
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="url"
                value={formData.photoUrl}
                onChange={(e) => updateFormData('photoUrl', e.target.value)}
                placeholder="URL de foto"
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: 'rgba(229, 57, 53, 0.1)',
                border: '1px solid rgba(229, 57, 53, 0.3)',
              }}
            >
              <p style={{ color: '#E53935', fontSize: 'var(--cp-caption-size)' }}>{error}</p>
            </div>
          )}

        </form>

        {/* Buttons - Fixed at bottom */}
        <div
          className="sticky bottom-0 px-4 py-4 flex gap-3"
          style={{
            background: 'var(--cp-background)',
            borderTop: '1px solid var(--cp-surface-border)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 font-medium transition-all"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface-muted)',
              borderRadius: '8px',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: '#E53935',
              color: 'white',
              borderRadius: '8px',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              player ? 'Actualizar' : 'Crear'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
