'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from './button'
import Image from 'next/image'
import { buildAuthHeaders } from '@/lib/client-auth'

interface ImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  disabled?: boolean
  maxSizeBytes?: number
  acceptedTypes?: string[]
  placeholder?: string
}

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  maxSizeBytes = 2 * 1024 * 1024, // 2MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  placeholder = 'Subir imagen para tablas o diagramas'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      alert('Tipo de archivo no soportado. Use JPG, PNG o WebP.')
      return
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      const maxSizeMB = maxSizeBytes / (1024 * 1024)
      alert(`El archivo es muy grande. Máximo ${maxSizeMB}MB.`)
      return
    }

    try {
      setUploading(true)

      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload using our internal API endpoint
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al subir imagen')
      }

      const data = await response.json()
      const imageUrl = data.url

      setPreview(imageUrl)
      onChange(imageUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (disabled || uploading) return

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const removeImage = () => {
    setPreview(null)
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {preview ? (
        <div className="relative group">
          <div className="relative w-full max-w-md">
            <Image
              src={preview}
              alt="Preview"
              width={400}
              height={300}
              className="rounded-lg border border-white/20 w-full h-auto"
              style={{ maxHeight: '300px', objectFit: 'contain' }}
            />

            {!disabled && (
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={openFileDialog}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`
            border-2 border-dashed border-white/30 rounded-lg p-6 text-center cursor-pointer
            transition-colors hover:border-white/50 hover:bg-white/5
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${uploading ? 'cursor-wait' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red"></div>
            ) : (
              <ImageIcon className="w-8 h-8 text-white/60" />
            )}

            <div className="text-white/70">
              <p className="font-medium">
                {uploading ? 'Subiendo imagen...' : placeholder}
              </p>
              <p className="text-sm text-white/50 mt-1">
                {uploading ? 'Por favor espera' : 'Arrastra aquí o haz click para seleccionar'}
              </p>
              <p className="text-xs text-white/40 mt-1">
                JPG, PNG, WebP (máx. 2MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {!preview && !uploading && (
        <Button
          type="button"
          variant="outline"
          onClick={openFileDialog}
          disabled={disabled}
          className="w-full text-white border-white/30 hover:bg-white/10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Subir Imagen
        </Button>
      )}
    </div>
  )
}