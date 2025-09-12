'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, User, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      } else {
        setError('Error al cargar el perfil')
      }
    } catch (error) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: profile.pin || undefined,
          birthDate: profile.birthDate || undefined,
          email: profile.email || undefined,
          phone: profile.phone || undefined,
        }),
      })

      if (response.ok) {
        setSuccess('Perfil actualizado correctamente')
      } else {
        const data = await response.json()
        setError(data.message || 'Error al actualizar el perfil')
      }
    } catch (error) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof PlayerProfile, value: string) => {
    if (!profile) return
    setProfile({
      ...profile,
      [field]: value
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-enter">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-poker-card"></div>
            <div className="absolute inset-0 rounded-full border-4 border-poker-red border-t-transparent animate-spin"></div>
          </div>
          <p className="text-poker-muted">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-poker-text">No se pudo cargar el perfil</p>
      </div>
    )
  }

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
  const aliasesText = profile.aliases.join(', ') || 'Sin alias'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-poker-muted hover:text-poker-red transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <h1 className="text-xl font-bold text-poker-text">Mi Perfil</h1>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>

      {/* Profile Photo and Name */}
      <div className="text-center py-8">
        <div className="w-32 h-32 bg-poker-red rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-lg">
          {initials}
        </div>
        <h2 className="text-2xl font-bold text-poker-text">
          {profile.firstName} {profile.lastName}
        </h2>
        <p className="text-poker-muted mt-1">
          {aliasesText}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PIN */}
        <div className="space-y-2">
          <Label htmlFor="pin" className="text-poker-text font-medium">
            PIN de Acceso
          </Label>
          <Input
            id="pin"
            type="password"
            placeholder="4 dígitos"
            value={profile.pin || ''}
            onChange={(e) => handleInputChange('pin', e.target.value)}
            maxLength={4}
            className="bg-poker-card/50 border-white/10 text-white placeholder:text-gray-400 focus:border-poker-red focus:ring-poker-red/30"
          />
          <p className="text-sm text-gray-400">
            PIN único para acceder al sistema
          </p>
        </div>

        {/* Fecha de Cumpleaños */}
        <div className="space-y-2">
          <Label htmlFor="birthDate" className="text-poker-text font-medium">
            Fecha de Cumpleaños
          </Label>
          <Input
            id="birthDate"
            type="date"
            value={profile.birthDate || '1975-01-01'}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
            className="bg-poker-card/50 border-white/10 text-white focus:border-poker-red focus:ring-poker-red/30"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-poker-text font-medium">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={profile.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="bg-poker-card/50 border-white/10 text-white placeholder:text-gray-400 focus:border-poker-red focus:ring-poker-red/30"
          />
        </div>

        {/* Celular */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-poker-text font-medium">
            Número de Celular
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="099 123 4567"
            value={profile.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="bg-poker-card/50 border-white/10 text-white placeholder:text-gray-400 focus:border-poker-red focus:ring-poker-red/30"
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Save Button */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-poker-red hover:bg-red-700 text-white font-medium h-12"
        >
          {saving ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Guardando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Save size={18} />
              <span>Guardar Cambios</span>
            </div>
          )}
        </Button>
      </form>
    </div>
  )
}