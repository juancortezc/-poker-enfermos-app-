/**
 * Validacion del cuerpo de POST/PATCH /api/proposals-v2. Pura: se prueba en
 * tests/proposal-input.test.ts.
 */

export const PROPOSAL_FIELD_LIMITS = {
  title: 200,
  objective: 1000,
  situation: 2000,
  proposal: 3000,
} as const

/** Tope de la URL de imagen (las de Vercel Blob rondan los 120 caracteres). */
export const PROPOSAL_IMAGE_URL_MAX = 2048

const ETIQUETAS: Record<keyof typeof PROPOSAL_FIELD_LIMITS, string> = {
  title: 'El título',
  objective: 'El objetivo',
  situation: 'La situación a modificar',
  proposal: 'La propuesta',
}

export interface ProposalInput {
  title: string
  objective: string
  situation: string
  proposal: string
  imageUrl: string | null
}

export type ProposalInputResult = { ok: true; value: ProposalInput } | { ok: false; error: string }

/**
 * Solo `https:`. Bloquea `javascript:`, `data:` y `http:` (la imagen se pinta
 * en <img> y se abre en otra pestana: una URL arbitraria era XSS).
 */
export function normalizeImageUrl(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'La URL de la imagen debe ser texto' }
  const value = raw.trim()
  if (value === '') return { ok: true, value: null }
  if (value.length > PROPOSAL_IMAGE_URL_MAX) {
    return { ok: false, error: `La URL de la imagen no puede exceder ${PROPOSAL_IMAGE_URL_MAX} caracteres` }
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { ok: false, error: 'La URL de la imagen no es válida' }
  }
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'La URL de la imagen debe empezar con https://' }
  }
  return { ok: true, value }
}

/** true si la URL se puede mostrar o abrir sin riesgo (para la UI). */
export function isSafeImageUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false
  const r = normalizeImageUrl(raw)
  return r.ok && r.value !== null
}

export function parseProposalInput(body: unknown): ProposalInputResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON' }
  }
  const b = body as Record<string, unknown>

  const campos = {} as Record<keyof typeof PROPOSAL_FIELD_LIMITS, string>
  for (const key of Object.keys(PROPOSAL_FIELD_LIMITS) as (keyof typeof PROPOSAL_FIELD_LIMITS)[]) {
    const raw = b[key]
    if (typeof raw !== 'string' || raw.trim() === '') {
      return { ok: false, error: 'Título, objetivo, situación y propuesta son obligatorios' }
    }
    const value = raw.trim()
    if (value.length > PROPOSAL_FIELD_LIMITS[key]) {
      return {
        ok: false,
        error: `${ETIQUETAS[key]} no puede exceder ${PROPOSAL_FIELD_LIMITS[key]} caracteres`,
      }
    }
    campos[key] = value
  }

  const image = normalizeImageUrl(b.imageUrl)
  if (!image.ok) return image

  return { ok: true, value: { ...campos, imageUrl: image.value } }
}
