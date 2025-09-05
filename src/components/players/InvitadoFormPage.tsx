'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Player {
  id: string
  firstName: string
  lastName: string
}

interface InvitadoFormPageProps {
  invitadoId?: string
}

interface FormData {
  firstName: string
  lastName: string
  inviterId: string
  joinYear: string
}

export default function InvitadoFormPage({ invitadoId }: InvitadoFormPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [enfermos, setEnfermos] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currentYear = new Date().getFullYear()
  const isEditing = !!invitadoId
  
  // Get returnTo from URL params
  const [returnTo, setReturnTo] = useState<string>('/players')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const returnToParam = params.get('returnTo')
      if (returnToParam) {
        setReturnTo(returnToParam)
      }
    }
  }, [])

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    inviterId: '',
    joinYear: currentYear.toString()
  })

  // Verificar permisos
  useEffect(() => {
    if (user && user.role !== UserRole.Comision) {
      router.push('/players')
      return
    }
  }, [user, router])

  // Cargar lista de Enfermos/Comisión para seleccionar invitador
  useEffect(() => {
    if (user?.adminKey) {
      fetchEnfermos()
    }
  }, [user?.adminKey])

  const fetchEnfermos = async () => {
    try {
      const response = await fetch('/api/players?role=Enfermo,Comision', {
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Filtrar solo Enfermos y Comisión activos
        const enfermosData = data.filter((p: any) => 
          (p.role === UserRole.Enfermo || p.role === UserRole.Comision) && p.isActive
        )
        setEnfermos(enfermosData)
      }
    } catch (err) {
      console.error('Error fetching enfermos:', err)
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

      if (!formData.inviterId) {
        throw new Error('Debe seleccionar el Enfermo que lo invita')
      }

      const year = parseInt(formData.joinYear)
      if (year < 2000 || year > currentYear) {
        throw new Error(`El año debe estar entre 2000 y ${currentYear}`)
      }

      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: UserRole.Invitado,
        aliases: [],
        inviterId: formData.inviterId,
        photoUrl: 'https://storage.googleapis.com/poker-enfermos/pato.png', // Imagen genérica de pato
        joinYear: year
      }

      const url = isEditing ? `/api/players/${invitadoId}` : '/api/players'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar invitado')
      }

      router.push(`/${returnTo}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
            onClick={() => router.push(returnTo)}
            className="text-poker-muted hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-xl font-bold text-white">
            {isEditing ? 'Editar Invitado' : 'Nuevo Invitado'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de perfil - Pato genérico */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-poker-card border-2 border-white/10">
              <Image
                src="https://storage.googleapis.com/poker-enfermos/pato.png"
                alt="Invitado"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Información básica */}
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

            {/* Enfermo que invita */}
            <div>
              <Label htmlFor="inviterId" className="text-poker-text">Enfermo que invita *</Label>
              <select
                id="inviterId"
                value={formData.inviterId}
                onChange={(e) => updateFormData('inviterId', e.target.value)}
                className="w-full p-2 bg-poker-dark/50 border border-white/10 rounded-md text-white focus:border-poker-red focus:outline-none"
                required
              >
                <option value="">Seleccionar Enfermo...</option>
                {enfermos.map((enfermo) => (
                  <option key={enfermo.id} value={enfermo.id}>
                    {enfermo.firstName} {enfermo.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Invitado desde */}
            <div>
              <Label htmlFor="joinYear" className="text-poker-text">Invitado desde *</Label>
              <Input
                id="joinYear"
                type="number"
                min="2000"
                max={currentYear}
                value={formData.joinYear}
                onChange={(e) => updateFormData('joinYear', e.target.value)}
                className="bg-poker-dark/50 border-white/10 text-white focus:border-poker-red"
                placeholder={currentYear.toString()}
                required
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