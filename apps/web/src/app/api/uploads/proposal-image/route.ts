import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { put } from '@vercel/blob'
import { withAuth } from '@/lib/api-auth'
import { checkUpload, MAX_UPLOAD_BYTES } from '@/lib/image-upload'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * POST /api/uploads/proposal-image — sube la imagen de una propuesta a
 * Vercel Blob y devuelve `{ url }` (https, publica). Cualquier usuario
 * autenticado: es quien puede crear propuestas.
 *
 * Cuerpo: multipart/form-data con el campo `file`. PNG, JPEG o WebP (se
 * comprueba por los bytes, no por la extension), maximo 1 MB.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  return withAuth(request, async (req, user) => {
    // Corte temprano si el cliente declara algo enorme (multipart agrega
    // unos cientos de bytes de cabeceras, de ahi el margen).
    const declared = Number(req.headers.get('content-length') ?? '0')
    if (declared > MAX_UPLOAD_BYTES + 16 * 1024) {
      throw new AppError('La imagen supera 1 MB', 413, 'FILE_TOO_LARGE')
    }

    let file: FormDataEntryValue | null
    try {
      file = (await req.formData()).get('file')
    } catch {
      throw AppError.badRequest('Se esperaba multipart/form-data con el campo "file"', 'INVALID_MULTIPART')
    }
    if (!file || typeof file === 'string') {
      throw AppError.badRequest('Falta el archivo en el campo "file"', 'FILE_REQUIRED')
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const check = checkUpload(bytes)
    if (!check.ok) {
      throw new AppError(check.error, check.status, check.status === 413 ? 'FILE_TOO_LARGE' : 'INVALID_IMAGE')
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[upload] BLOB_READ_WRITE_TOKEN no configurado')
      throw AppError.unavailable('La subida de imágenes no está disponible', 'UPLOAD_UNAVAILABLE')
    }

    try {
      const blob = await put(
        `proposals/${user.id}/${randomUUID()}.${check.image.ext}`,
        Buffer.from(bytes),
        {
          access: 'public',
          contentType: check.image.contentType,
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        }
      )
      return ok({ url: blob.url }, 201)
    } catch (error) {
      console.error('[upload] Error subiendo a Blob:', error)
      throw new AppError('No se pudo subir la imagen', 502, 'UPLOAD_FAILED')
    }
  })
})
