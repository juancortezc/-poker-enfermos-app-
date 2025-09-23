'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'

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
  joinYear?: number
  isActive: boolean
}

interface PlayerFormPageProps {
  playerId?: string
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
  joinYear: string
}

export default function PlayerFormPage({ playerId }: PlayerFormPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [imageError, setImageError] = useState(false)
  const currentYear = new Date().getFullYear()
  const isEditing = !!playerId

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    role: UserRole.Enfermo,
    aliases: [''],
    pin: '',
    birthDate: '',
    phone: '',
    email: '',
    photoUrl: '',
    joinYear: currentYear.toString()
  })

  // Verificar permisos
  useEffect(() => {
    if (user && user.role !== UserRole.Comision) {
      router.push('/players')
      return
    }
  }, [user, router])

  // Cargar jugador si estamos editando
  useEffect(() => {
    if (playerId && user) {
      fetchPlayer()
    }
  }, [playerId, user])

  // Reset image error when photoUrl changes
  useEffect(() => {
    setImageError(false)
  }, [formData.photoUrl])

  const fetchPlayer = async () => {
    if (!playerId) return

    try {
      setLoading(true)

      if (!getStoredAuthToken()) {
        setLoading(false)
        return
      }

      const response = await fetch(`/api/players/${playerId}`, {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const playerData = await response.json()
        setPlayer(playerData)
        setFormData({
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          role: playerData.role,
          aliases: playerData.aliases.length > 0 ? playerData.aliases : [''],
          pin: playerData.pin ? '****' : '',
          birthDate: playerData.birthDate || '',
          phone: playerData.phone || '',
          email: playerData.email || '',
          photoUrl: playerData.photoUrl || '',
          joinYear: playerData.joinYear?.toString() || currentYear.toString()
        })
      } else {
        setError('Error al cargar jugador')
      }
    } catch (err) {
      setError('Error al cargar jugador')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validaciones
      if (!formData.firstName.trim()) {
        throw new Error('Nombre es obligatorio')
      }
      
      if (!formData.lastName.trim()) {
        throw new Error('Apellido es obligatorio')
      }

      if (formData.pin && formData.pin !== '****' && !/^\d{4}$/.test(formData.pin)) {
        throw new Error('El PIN debe ser de 4 dígitos')
      }

      if (!formData.photoUrl.trim()) {
        throw new Error('URL de imagen es obligatoria')
      }

      const year = parseInt(formData.joinYear)
      if (year < 2000 || year > currentYear) {
        throw new Error(`El año debe estar entre 2000 y ${currentYear}`)
      }

      // Solo roles Enfermo y Comision
      if (formData.role === UserRole.Invitado) {
        throw new Error('Este formulario es solo para Enfermos y Comisión')
      }

      // Limpiar aliases vacíos
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
        photoUrl: formData.photoUrl.trim(),
        joinYear: year
      }

      const url = isEditing ? `/api/players/${playerId}` : '/api/players'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar jugador')
      }

      router.push('/players')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: string | UserRole | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addAlias = () => {
    setFormData(prev => ({
      ...prev,
      aliases: [...prev.aliases, '']
    }))
  }

  const removeAlias = (index: number) => {
    if (formData.aliases.length > 1) {
      setFormData(prev => ({
        ...prev,
        aliases: prev.aliases.filter((_, i) => i !== index)
      }))
    }
  }

  const updateAlias = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.map((alias, i) => i === index ? value : alias)
    }))
  }

  if (!user || user.role !== UserRole.Comision) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-poker-muted">Sin permisos para acceder a esta página</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark pb-safe">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/players')}
            className="text-poker-muted hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-xl font-bold text-white">
            {isEditing ? 'Editar Jugador' : 'Nuevo Jugador'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de perfil */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-poker-card border-2 border-white/10">
              {formData.photoUrl && !imageError ? (
                <Image
                  src={formData.photoUrl}
                  alt="Preview"
                  width={120}
                  height={120}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-poker-muted">
                  <span className="text-4xl">👤</span>
                </div>
              )}
            </div>
          </div>

        {/* Primera sección - Información básica */}
        <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-poker-text">Nombre *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateFormData('firstName', e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-poker-text">Apellido *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateFormData('lastName', e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                required
              />
            </div>
          </div>

          {/* PIN */}
          <div>
            <Label htmlFor="pin" className="text-poker-text">PIN (4 dígitos)</Label>
            <Input
              id="pin"
              type="text"
              maxLength={4}
              pattern="\d{4}"
              value={formData.pin}
              placeholder={player?.pin ? '****' : '1234'}
              onFocus={() => {
                if (formData.pin === '****') {
                  updateFormData('pin', '')
                }
              }}
              onChange={(e) => updateFormData('pin', e.target.value.replace(/\D/g, ''))}
              className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
            />
          </div>

          {/* Aliases */}
          <div>
            <Label className="text-poker-text">Aliases/Apodos</Label>
            <div className="space-y-2">
              {formData.aliases.map((alias, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    value={alias}
                    onChange={(e) => updateAlias(index, e.target.value)}
                    placeholder={`Alias ${index + 1}`}
                    className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                  />
                  {formData.aliases.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAlias(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addAlias}
                className="text-poker-cyan hover:text-poker-cyan/80 hover:bg-poker-cyan/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar alias
              </Button>
            </div>
          </div>

          {/* URL de foto */}
          <div>
            <Label htmlFor="photoUrl" className="text-poker-text">URL de imagen *</Label>
            <Input
              id="photoUrl"
              type="url"
              value={formData.photoUrl}
              onChange={(e) => updateFormData('photoUrl', e.target.value)}
              className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
              placeholder="https://..."
              required
            />
          </div>

          {/* Rol */}
          <div>
            <Label htmlFor="role" className="text-poker-text">Rol *</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => updateFormData('role', e.target.value as UserRole)}
              className="w-full p-2 bg-poker-dark/50 border border-white/10 rounded-md text-white focus:border-poker-red focus:outline-none"
              required
            >
              <option value={UserRole.Enfermo}>Enfermo</option>
              <option value={UserRole.Comision}>Comisión</option>
            </select>
          </div>
        </div>

        {/* Toggle Mas Info */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowMoreInfo(!showMoreInfo)}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
        >
          Mas Info
          {showMoreInfo ? (
            <ChevronUp className="w-4 h-4 ml-2" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-2" />
          )}
        </Button>

        {/* Segunda sección - Información adicional */}
        {showMoreInfo && (
          <div className="space-y-4 bg-poker-card p-6 rounded-lg border border-white/10">
            {/* Fecha de nacimiento */}
            <div>
              <Label htmlFor="birthDate" className="text-poker-text">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateFormData('birthDate', e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
              />
            </div>

            {/* Teléfono */}
            <div>
              <Label htmlFor="phone" className="text-poker-text">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                placeholder="0999123456"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-poker-text">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                placeholder="email@ejemplo.com"
              />
            </div>

            {/* Enfermo desde */}
            <div>
              <Label htmlFor="joinYear" className="text-poker-text">Enfermo desde</Label>
              <Input
                id="joinYear"
                type="number"
                min="2000"
                max={currentYear}
                value={formData.joinYear}
                onChange={(e) => updateFormData('joinYear', e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                placeholder={currentYear.toString()}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/players')}
            className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-poker-red hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear'}
              </>
            )}
          </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
