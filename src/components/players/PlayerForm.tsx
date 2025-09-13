'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Save, Loader2, Plus, Minus } from 'lucide-react'

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

interface PlayerFormProps {
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

export default function PlayerForm({ 
  player, 
  isOpen, 
  onClose, 
  onSave, 
  defaultRole = UserRole.Enfermo 
}: PlayerFormProps) {
  const { user } = useAuth()
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

  // Cargar datos del jugador si estamos editando
  useEffect(() => {
    if (player) {
      setFormData({
        firstName: player.firstName,
        lastName: player.lastName,
        role: player.role,
        aliases: player.aliases.length > 0 ? player.aliases : [''],
        pin: player.pin || '',
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

  // Cargar lista de enfermos para seleccionar invitador
  useEffect(() => {
    fetchEnfermos()
  }, [])

  const fetchEnfermos = async () => {
    try {
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const response = await fetch('/api/players?role=Enfermo', {
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json'
        }
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
      // Validaciones básicas
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('Nombre y apellido son obligatorios')
      }

      if (formData.pin && !/^\d{4}$/.test(formData.pin)) {
        throw new Error('El PIN debe ser de 4 dígitos')
      }

      if (formData.role === UserRole.Invitado && !formData.inviterId) {
        throw new Error('Los invitados deben tener un Enfermo que los invite')
      }

      // Limpiar aliases vacíos
      const cleanAliases = formData.aliases.filter(alias => alias.trim())

      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        aliases: cleanAliases,
        pin: formData.pin || undefined,
        birthDate: formData.birthDate || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        photoUrl: formData.photoUrl || undefined,
        inviterId: formData.role === UserRole.Invitado ? formData.inviterId : undefined
      }

      const url = player ? `/api/players/${player.id}` : '/api/players'
      const method = player ? 'PUT' : 'POST'

      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json',
        },
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg bg-poker-card border-white/20 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-poker-text">
            {player ? 'Editar Jugador' : 'Nuevo Jugador'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-poker-muted hover:text-poker-red"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información básica */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-poker-text">Nombre *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  className="bg-poker-dark/50 border-white/10 text-poker-text"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-poker-text">Apellido *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  className="bg-poker-dark/50 border-white/10 text-poker-text"
                  required
                />
              </div>
            </div>

            {/* Rol */}
            <div>
              <Label htmlFor="role" className="text-poker-text">Rol</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => updateFormData('role', e.target.value as UserRole)}
                className="w-full p-2 bg-poker-dark/50 border border-white/10 rounded-md text-poker-text"
              >
                <option value={UserRole.Enfermo}>Enfermo</option>
                <option value={UserRole.Comision}>Comisión</option>
                <option value={UserRole.Invitado}>Invitado</option>
              </select>
            </div>

            {/* Invitador (solo para invitados) */}
            {formData.role === UserRole.Invitado && (
              <div>
                <Label htmlFor="inviterId" className="text-poker-text">Invitado por *</Label>
                <select
                  id="inviterId"
                  value={formData.inviterId}
                  onChange={(e) => updateFormData('inviterId', e.target.value)}
                  className="w-full p-2 bg-poker-dark/50 border border-white/10 rounded-md text-poker-text"
                  required
                >
                  <option value="">Seleccionar enfermo...</option>
                  {enfermos.map((enfermo) => (
                    <option key={enfermo.id} value={enfermo.id}>
                      {enfermo.firstName} {enfermo.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PIN */}
            <div>
              <Label htmlFor="pin" className="text-poker-text">PIN (4 dígitos)</Label>
              <Input
                id="pin"
                type="text"
                maxLength={4}
                pattern="\d{4}"
                value={formData.pin}
                onChange={(e) => updateFormData('pin', e.target.value.replace(/\D/g, ''))}
                className="bg-poker-dark/50 border-white/10 text-poker-text"
                placeholder="1234"
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
                      className="bg-poker-dark/50 border-white/10 text-poker-text"
                    />
                    {formData.aliases.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAlias(index)}
                        className="text-poker-muted hover:text-red-400"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addAlias}
                  className="text-poker-cyan hover:text-poker-cyan/80"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar alias
                </Button>
              </div>
            </div>

            {/* Información adicional */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="birthDate" className="text-poker-text">Fecha de nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => updateFormData('birthDate', e.target.value)}
                  className="bg-poker-dark/50 border-white/10 text-poker-text"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-poker-text">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  className="bg-poker-dark/50 border-white/10 text-poker-text"
                  placeholder="0999123456"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-poker-text">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="bg-poker-dark/50 border-white/10 text-poker-text"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="photoUrl" className="text-poker-text">URL de foto</Label>
                <Input
                  id="photoUrl"
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) => updateFormData('photoUrl', e.target.value)}
                  className="bg-poker-dark/50 border-white/10 text-poker-text"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
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
                    {player ? 'Actualizar' : 'Crear'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}