'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { Phone, Mail, Cake, Eye, EyeOff, Save, Loader2 } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'

interface PlayerProfile {
  id: string
  firstName: string
  lastName: string
  aliases: string[]
  pin?: string
  birthDate?: string
  email?: string
  phone?: string
  photoUrl?: string
  role: string
}

// CleanForm input style
const inputStyle = {
  background: 'var(--cp-background)',
  border: '1px solid var(--cp-surface-border)',
  color: 'var(--cp-on-surface)',
  fontSize: 'var(--cp-body-size)',
  borderRadius: '4px',
}

export default function DatosTab() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [form, setForm] = useState({
    phone: '',
    email: '',
    birthDate: '',
    pin: '',
    confirmPin: ''
  })
  const [showPin, setShowPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile', {
        headers: buildAuthHeaders({}, { includeJson: true })
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setForm({
          phone: data.phone || '',
          email: data.email || '',
          birthDate: data.birthDate?.split('T')[0] || '',
          pin: '',
          confirmPin: ''
        })
      } else {
        setError('Error al cargar el perfil')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate PIN if provided
    if (form.pin || form.confirmPin) {
      if (form.pin !== form.confirmPin) {
        setError('Los PINs no coinciden')
        return
      }
      if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
        setError('El PIN debe ser de 4 dígitos')
        return
      }
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          phone: form.phone || undefined,
          email: form.email || undefined,
          birthDate: form.birthDate || undefined,
          pin: form.pin || undefined,
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setForm(prev => ({ ...prev, pin: '', confirmPin: '' }))
        await fetchProfile()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando perfil...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: 'var(--cp-on-surface-muted)' }}>
          No se pudo cargar el perfil
        </p>
      </div>
    )
  }

  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="space-y-4">
      {/* Profile Header - Hero Card */}
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(229, 57, 53, 0.15) 0%, rgba(26, 26, 26, 0.95) 100%)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        {/* Avatar */}
        <div
          className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #E53935, #f97316)',
          }}
        >
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={`${profile.firstName} ${profile.lastName}`}
              fill
              className="object-cover"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-xl font-bold"
              style={{ color: 'white' }}
            >
              {initials || '??'}
            </span>
          )}
        </div>

        {/* Name */}
        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          {profile.firstName} {profile.lastName}
        </h2>

        {/* Role Badge */}
        {profile.role === 'Comision' && (
          <span
            className="inline-block mt-2 px-3 py-1 text-xs font-medium"
            style={{
              background: 'rgba(229, 57, 53, 0.2)',
              color: '#E53935',
              borderRadius: '4px',
            }}
          >
            Comisión
          </span>
        )}
      </div>

      {/* CleanForm: Contact Section */}
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
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Celular"
            className="flex-1 px-3 py-2.5"
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="flex-1 px-3 py-2.5"
            style={inputStyle}
          />
        </div>

        {/* Birthday */}
        <div className="flex items-center gap-2">
          <Cake className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="flex-1 px-3 py-2.5"
            style={inputStyle}
          />
        </div>
      </div>

      {/* CleanForm: PIN Section */}
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
          Cambiar PIN
        </p>
        <p
          style={{ fontSize: '11px', color: 'var(--cp-on-surface-muted)', marginTop: '-4px' }}
        >
          Deja en blanco para mantener el PIN actual
        </p>

        {/* New PIN */}
        <div className="relative">
          <input
            type={showPin ? 'text' : 'password'}
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="Nuevo PIN (4 dígitos)"
            maxLength={4}
            className="w-full px-3 py-2.5 pr-10"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirm PIN */}
        <div className="relative">
          <input
            type={showConfirmPin ? 'text' : 'password'}
            value={form.confirmPin}
            onChange={(e) => setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="Confirmar PIN"
            maxLength={4}
            className="w-full px-3 py-2.5 pr-10"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPin(!showConfirmPin)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div
          className="rounded-lg p-3 text-center"
          style={{
            background: 'rgba(229, 57, 53, 0.1)',
            border: '1px solid rgba(229, 57, 53, 0.3)',
          }}
        >
          <p style={{ color: '#E53935', fontSize: 'var(--cp-caption-size)' }}>
            {error}
          </p>
        </div>
      )}

      {success && (
        <div
          className="rounded-lg p-3 text-center"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <p style={{ color: '#22c55e', fontSize: 'var(--cp-caption-size)' }}>
            Perfil actualizado correctamente
          </p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 font-semibold flex items-center justify-center gap-2"
        style={{
          background: '#E53935',
          color: 'white',
          opacity: saving ? 0.7 : 1,
          borderRadius: '8px',
        }}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </div>
  )
}
