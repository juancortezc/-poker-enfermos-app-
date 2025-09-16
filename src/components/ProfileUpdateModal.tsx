'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'

interface ProfileUpdateModalProps {
  isOpen: boolean
  onComplete: () => void
}

interface ProfileData {
  pin: string
  birthDate: string
  email: string
  phone: string
}

interface ValidationErrors {
  pin?: string
  birthDate?: string
  email?: string
  phone?: string
}

export function ProfileUpdateModal({ isOpen, onComplete }: ProfileUpdateModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<ProfileData>({
    pin: '',
    birthDate: '',
    email: '',
    phone: ''
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')

  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setFormData({
        pin: '',
        birthDate: '',
        email: '',
        phone: ''
      })
      setErrors({})
    }
  }, [isOpen])

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Validar PIN
    if (!formData.pin) {
      newErrors.pin = 'PIN es requerido'
    } else if (!/^\d{4}$/.test(formData.pin)) {
      newErrors.pin = 'PIN debe ser de 4 dígitos'
    }

    // Validar fecha de cumpleaños
    if (!formData.birthDate) {
      newErrors.birthDate = 'Fecha de cumpleaños es requerida'
    }

    // Validar email
    if (!formData.email) {
      newErrors.email = 'Correo electrónico es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido'
    }

    // Validar teléfono
    if (!formData.phone) {
      newErrors.phone = 'Número de celular es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      // Get auth token from localStorage
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const adminKey = typeof window !== 'undefined' ? localStorage.getItem('poker-adminkey') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // Use PIN if available, otherwise fall back to adminKey
      if (pin) {
        headers['Authorization'] = `Bearer PIN:${pin}`
      } else if (adminKey) {
        headers['Authorization'] = `Bearer ADMIN:${adminKey}`
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          pin: formData.pin,
          birthDate: formData.birthDate,
          email: formData.email,
          phone: formData.phone,
          markComplete: true // Flag para marcar perfil como completo
        }),
      })

      if (response.ok) {
        setStep('success')
        // Wait a moment then complete
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        const data = await response.json()
        if (data.message.includes('PIN ya está en uso')) {
          setErrors({ pin: 'Este PIN ya está siendo usado por otro jugador' })
        } else {
          setErrors({ pin: data.message || 'Error al actualizar el perfil' })
        }
      }
    } catch (error) {
      setErrors({ pin: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-poker-card rounded-2xl shadow-2xl border border-white/10 w-full max-w-md mx-auto">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="text-center p-6 border-b border-white/10">
              <div className="flex justify-center mb-4">
                <UserAvatar user={user} size="lg" className="shadow-lg" />
              </div>
              <h2 className="text-xl font-bold text-poker-text mb-2">
                Completa tu perfil
              </h2>
              <p className="text-poker-muted text-sm">
                Actualiza tu información para continuar
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* PIN */}
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-poker-text font-medium">
                  PIN de Acceso *
                </Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="4 dígitos"
                  value={formData.pin}
                  onChange={(e) => handleInputChange('pin', e.target.value)}
                  maxLength={4}
                  className={`bg-poker-card/50 border-white/10 text-white placeholder:text-gray-400 focus:border-poker-red focus:ring-poker-red/30 ${
                    errors.pin ? 'border-red-500' : ''
                  }`}
                />
                {errors.pin && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {errors.pin}
                  </div>
                )}
              </div>

              {/* Fecha de Cumpleaños */}
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-poker-text font-medium">
                  Fecha de Cumpleaños *
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className={`bg-poker-card/50 border-white/10 text-white focus:border-poker-red focus:ring-poker-red/30 ${
                    errors.birthDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.birthDate && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {errors.birthDate}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-poker-text font-medium">
                  Correo Electrónico *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`bg-poker-card/50 border-white/10 text-white placeholder:text-gray-400 focus:border-poker-red focus:ring-poker-red/30 ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                />
                {errors.email && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Celular */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-poker-text font-medium">
                  Número de Celular *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="099 123 4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`bg-poker-card/50 border-white/10 text-white placeholder:text-gray-400 focus:border-poker-red focus:ring-poker-red/30 ${
                    errors.phone ? 'border-red-500' : ''
                  }`}
                />
                {errors.phone && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {errors.phone}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-poker-red hover:bg-red-700 text-white font-medium h-12 mt-6"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Save size={18} />
                    <span>Guardar y Continuar</span>
                  </div>
                )}
              </Button>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="text-center p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-poker-text mb-2">
              ¡Perfil actualizado!
            </h2>
            <p className="text-poker-muted">
              Tu información ha sido guardada correctamente
            </p>
          </div>
        )}
      </div>
    </div>
  )
}