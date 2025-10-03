'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { Button } from '@/components/ui/button'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import { Send, X, Image as ImageIcon } from 'lucide-react'

interface ProposalData {
  id?: number
  title: string
  objective: string
  situation: string
  proposal: string
  imageUrl?: string | null
}

interface ProposalFormProps {
  initialData?: ProposalData
  isEditing?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProposalForm({
  initialData,
  isEditing = false,
  onSuccess,
  onCancel
}: ProposalFormProps) {
  const [formData, setFormData] = useState<ProposalData>({
    title: initialData?.title || '',
    objective: initialData?.objective || '',
    situation: initialData?.situation || '',
    proposal: initialData?.proposal || '',
    imageUrl: initialData?.imageUrl || ''
  })
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.imageUrl || null
  )

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        title: initialData.title || '',
        objective: initialData.objective || '',
        situation: initialData.situation || '',
        proposal: initialData.proposal || '',
        imageUrl: initialData.imageUrl || ''
      })
      setImagePreview(initialData.imageUrl || null)
    } else {
      setFormData({
        title: '',
        objective: '',
        situation: '',
        proposal: '',
        imageUrl: ''
      })
      setImagePreview(null)
    }
  }, [initialData])

  const handleInputChange = (field: keyof ProposalData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Handle image URL preview
    if (field === 'imageUrl') {
      if (value.trim()) {
        try {
          new URL(value.trim())
          setImagePreview(value.trim())
        } catch {
          setImagePreview(null)
        }
      } else {
        setImagePreview(null)
      }
    }
  }

  const isFormValid = () => {
    return (
      formData.title.trim() &&
      formData.objective.trim() &&
      formData.situation.trim() &&
      formData.proposal.trim()
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid()) {
      toast.error('Todos los campos obligatorios deben ser completados')
      return
    }

    try {
      setSaving(true)

      const endpoint = isEditing
        ? `/api/proposals-v2/${initialData?.id}`
        : '/api/proposals-v2'

      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          objective: formData.objective.trim(),
          situation: formData.situation.trim(),
          proposal: formData.proposal.trim(),
          imageUrl: formData.imageUrl?.trim() || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar propuesta')
      }

      toast.success(isEditing ? 'Propuesta actualizada exitosamente' : 'Propuesta creada exitosamente')

      if (onSuccess) {
        onSuccess()
      }

      // Reset form if not editing
      if (!isEditing) {
        setFormData({
          title: '',
          objective: '',
          situation: '',
          proposal: '',
          imageUrl: ''
        })
        setImagePreview(null)
      }

    } catch (error) {
      console.error('Error saving proposal:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar propuesta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="admin-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">
            {isEditing ? 'Editar Propuesta' : 'Nueva Propuesta'}
          </h3>
          <p className="text-sm text-white/60">
            Completa todos los campos obligatorios para crear tu propuesta
          </p>
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Título *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Título claro y conciso de tu propuesta..."
            maxLength={200}
            disabled={saving}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
          />
          <p className="text-xs text-white/50 mt-1">
            {formData.title.length}/200 caracteres
          </p>
        </div>

        {/* Objetivo */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Objetivo *
          </label>
          <AutoResizeTextarea
            value={formData.objective}
            onChange={(e) => handleInputChange('objective', e.target.value)}
            placeholder="¿Qué se busca lograr con esta propuesta?"
            maxLength={1000}
            disabled={saving}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-20"
          />
          <p className="text-xs text-white/50 mt-1">
            {formData.objective.length}/1000 caracteres
          </p>
        </div>

        {/* Situación a modificar */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Situación a Modificar *
          </label>
          <AutoResizeTextarea
            value={formData.situation}
            onChange={(e) => handleInputChange('situation', e.target.value)}
            placeholder="Describe la situación actual que requiere cambios..."
            maxLength={2000}
            disabled={saving}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-24"
          />
          <p className="text-xs text-white/50 mt-1">
            {formData.situation.length}/2000 caracteres
          </p>
        </div>

        {/* Propuesta */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Propuesta *
          </label>
          <AutoResizeTextarea
            value={formData.proposal}
            onChange={(e) => handleInputChange('proposal', e.target.value)}
            placeholder="Detalla tu propuesta de solución..."
            maxLength={3000}
            disabled={saving}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-32"
          />
          <p className="text-xs text-white/50 mt-1">
            {formData.proposal.length}/3000 caracteres
          </p>
        </div>

        {/* URL de Imagen */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Imagen (Opcional)
          </label>
          <Input
            value={formData.imageUrl}
            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            disabled={saving}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
          />
          <p className="text-xs text-white/50 mt-1">
            URL de una imagen para acompañar tu propuesta
          </p>

          {/* Vista previa de imagen */}
          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm text-white/70 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Vista previa de imagen:
              </p>
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-full max-w-md h-auto rounded-lg border border-white/20"
                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                  onError={() => setImagePreview(null)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={saving || !isFormValid()}
            className="flex-1 bg-poker-red hover:bg-poker-red/90"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Actualizando...' : 'Creando...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isEditing ? 'Actualizar Propuesta' : 'Crear Propuesta'}
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={saving}
              className="border-white/20 text-white hover:bg-white/5"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
