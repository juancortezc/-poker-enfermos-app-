import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Tipo de archivo no soportado' }, { status: 400 })
      }

      // Validate file size (2MB max)
      const maxSize = 2 * 1024 * 1024
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'Archivo muy grande (máx. 2MB)' }, { status: 400 })
      }

      // Create FormData for Cloudinary upload
      const cloudinaryFormData = new FormData()
      cloudinaryFormData.append('file', file)
      cloudinaryFormData.append('upload_preset', 'ml_default') // Use Cloudinary's default unsigned preset
      cloudinaryFormData.append('folder', 'proposals')

      // Try uploading to Cloudinary first
      try {
        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME || 'dxqsydswd'}/image/upload`,
          {
            method: 'POST',
            body: cloudinaryFormData
          }
        )

        if (cloudinaryResponse.ok) {
          const data = await cloudinaryResponse.json()
          return NextResponse.json({
            url: data.secure_url,
            publicId: data.public_id
          })
        }
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, using fallback:', cloudinaryError)
      }

      // Fallback: Convert to base64 data URL (temporary solution)
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`

      return NextResponse.json({
        url: dataUrl,
        publicId: null,
        fallback: true
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
  })
}