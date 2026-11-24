import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { withAuth } from '@/lib/api-auth'
import { checkUpload, MAX_UPLOAD_BYTES } from '@/lib/image-upload'

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
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // Corte temprano si el cliente declara algo enorme (multipart agrega
    // unos cientos de bytes de cabeceras, de ahi el margen).
    const declared = Number(req.headers.get('content-length') ?? '0')
    if (declared > MAX_UPLOAD_BYTES + 16 * 1024) {
      return NextResponse.json({ error: 'La imagen supera 1 MB' }, { status: 413 })
    }

    let file: FormDataEntryValue | null
    try {
      file = (await req.formData()).get('file')
    } catch {
      return NextResponse.json(
        { error: 'Se esperaba multipart/form-data con el campo "file"' },
        { status: 400 }
      )
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Falta el archivo en el campo "file"' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const check = checkUpload(bytes)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[upload] BLOB_READ_WRITE_TOKEN no configurado')
      return NextResponse.json({ error: 'La subida de imágenes no está disponible' }, { status: 503 })
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
      return NextResponse.json({ url: blob.url }, { status: 201 })
    } catch (error) {
      console.error('[upload] Error subiendo a Blob:', error)
      return NextResponse.json({ error: 'No se pudo subir la imagen' }, { status: 502 })
    }
  })
}
