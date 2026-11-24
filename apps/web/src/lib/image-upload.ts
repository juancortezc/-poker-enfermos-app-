/**
 * Reglas de las imagenes que se suben (POST /api/uploads/proposal-image).
 * Puras, sin Next ni Blob: se prueban en tests/image-upload.test.ts.
 */

export const MAX_UPLOAD_BYTES = 1024 * 1024 // 1 MB

export type AllowedImage = { contentType: 'image/png' | 'image/jpeg' | 'image/webp'; ext: 'png' | 'jpg' | 'webp' }

/**
 * Tipo real por los primeros bytes. No se confia en el Content-Type que
 * declara el cliente: un HTML renombrado a .png no pasa.
 */
export function sniffImage(bytes: Uint8Array): AllowedImage | null {
  const b = bytes
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { contentType: 'image/png', ext: 'png' }
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' }
  }
  if (b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) { // WEBP
    return { contentType: 'image/webp', ext: 'webp' }
  }
  return null
}

export type UploadCheck =
  | { ok: true; image: AllowedImage }
  | { ok: false; status: 400 | 413 | 415; error: string }

export function checkUpload(bytes: Uint8Array): UploadCheck {
  if (bytes.length === 0) return { ok: false, status: 400, error: 'El archivo está vacío' }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: 'La imagen supera 1 MB' }
  }
  const image = sniffImage(bytes)
  if (!image) {
    return { ok: false, status: 415, error: 'Solo se aceptan imágenes PNG, JPEG o WebP' }
  }
  return { ok: true, image }
}
