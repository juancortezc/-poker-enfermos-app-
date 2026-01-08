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
        className="rounded-2xl p-6 text-center"
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
      {/* Profile Header */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        {/* Avatar */}
        <div
          className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden"
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
              className="flex h-full w-full items-center justify-center text-2xl font-bold"
              style={{ color: 'white' }}
            >
              {initials || '??'}
            </span>
          )}
        </div>

        {/* Name */}
        <h2
          className="text-xl font-bold"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          {profile.firstName} {profile.lastName}
        </h2>

        {/* Role Badge */}
        {profile.role === 'Comision' && (
          <span
            className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(229, 57, 53, 0.2)',
              color: '#E53935',
            }}
          >
            Comisión
          </span>
        )}
      </div>

      {/* Contact Form */}
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <h3
          className="font-semibold mb-4"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          Datos de Contacto
        </h3>

        {/* Phone */}
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Celular"
            className="flex-1 rounded-xl px-4 py-3"
            style={{
              background: 'var(--cp-background)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
            }}
          />
        </div>

        {/* Email */}
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="flex-1 rounded-xl px-4 py-3"
            style={{
              background: 'var(--cp-background)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
            }}
          />
        </div>

        {/* Birthday */}
        <div className="flex items-center gap-3">
          <Cake className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="flex-1 rounded-xl px-4 py-3"
            style={{
              background: 'var(--cp-background)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
            }}
          />
        </div>
      </div>

      {/* PIN Section */}
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <h3
          className="font-semibold"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          Cambiar PIN
        </h3>
        <p
          className="text-xs"
          style={{ color: 'var(--cp-on-surface-muted)' }}
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
            className="w-full rounded-xl px-4 py-3 pr-12"
            style={{
              background: 'var(--cp-background)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
            className="w-full rounded-xl px-4 py-3 pr-12"
            style={{
              background: 'var(--cp-background)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-body-size)',
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPin(!showConfirmPin)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div
          className="rounded-xl p-4 text-center"
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
          className="rounded-xl p-4 text-center"
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
        className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
        style={{
          background: '#E53935',
          color: 'white',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {saving ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </div>
  )
}
