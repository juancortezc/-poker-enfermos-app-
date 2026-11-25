'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { Button } from '@/components/ui/button'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import { Send, X, Image as ImageIcon, Upload } from 'lucide-react'
import { isSafeImageUrl } from '@/lib/proposal-input'
import { MAX_UPLOAD_BYTES } from '@/lib/image-upload'
import { readApiJson } from '@/lib/api-client'

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
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(
    isSafeImageUrl(initialData?.imageUrl) ? initialData!.imageUrl! : null
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
      setImagePreview(isSafeImageUrl(initialData.imageUrl) ? initialData.imageUrl : null)
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
      // Solo https: es lo unico que acepta el servidor.
      setImagePreview(isSafeImageUrl(value.trim()) ? value.trim() : null)
    }
  }

  // Sube el archivo a /api/uploads/proposal-image y deja la URL en el campo.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Solo se aceptan imágenes PNG, JPEG o WebP')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('La imagen supera 1 MB')
      return
    }
    try {
      setUploading(true)
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads/proposal-image', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body
      })
      const data = await readApiJson(response).catch(() => ({}))
      if (!response.ok || typeof data.url !== 'string') {
        throw new Error(data.error || 'No se pudo subir la imagen')
      }
      handleInputChange('imageUrl', data.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
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
        const errorData = await readApiJson(response)
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
            value={formData.imageUrl ?? ''}
            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            disabled={saving}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/35 hover:text-white ${
                saving || uploading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/80"></div>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Subiendo...' : 'Subir imagen'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileUpload}
                disabled={saving || uploading}
              />
            </label>
            <p className="text-xs text-white/50">
              Pega un link https o sube una imagen (PNG, JPEG o WebP, máx. 1 MB)
            </p>
          </div>

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
            disabled={saving || uploading || !isFormValid()}
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
