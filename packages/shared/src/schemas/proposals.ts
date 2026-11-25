/** Esquemas de entrada de la API: propuestas (proposals-v2). */
import { z, playerIdSchema, queryBooleanSchema } from './common'

export const PROPOSAL_FIELD_LIMITS = {
  title: 200,
  objective: 1000,
  situation: 2000,
  proposal: 3000,
} as const

/** Tope de la URL de imagen (las de Vercel Blob rondan los 120 caracteres). */
export const PROPOSAL_IMAGE_URL_MAX = 2048

/** `https://host/...` sin espacios. Bloquea javascript:, data: y http:. */
const HTTPS_URL = /^https:\/\/[^\s/?#@]+(?:[/?#][^\s]*)?$/i

const OBLIGATORIOS = 'Título, objetivo, situación y propuesta son obligatorios'

function campo(etiqueta: string, max: number) {
  return z
    .string({ error: OBLIGATORIOS })
    .trim()
    .min(1, OBLIGATORIOS)
    .max(max, `${etiqueta} no puede exceder ${max} caracteres`)
}

/**
 * URL de imagen: ausente, null o vacia -> null; si no, solo `https:` y con
 * tope (la imagen se pinta en <img> y se abre en otra pestana: una URL
 * arbitraria era XSS).
 */
export const proposalImageUrlSchema = z
  .string({ error: 'La URL de la imagen debe ser texto' })
  .nullish()
  .transform((v) => (v == null ? '' : v.trim()))
  .pipe(
    z
      .string()
      .max(PROPOSAL_IMAGE_URL_MAX, `La URL de la imagen no puede exceder ${PROPOSAL_IMAGE_URL_MAX} caracteres`)
      .refine((v) => v === '' || HTTPS_URL.test(v), 'La URL de la imagen debe empezar con https://')
  )
  .transform((v) => (v === '' ? null : v))

/** Body de POST /api/proposals-v2 y PATCH /api/proposals-v2/[id]. */
export const proposalInputSchema = z.object(
  {
    title: campo('El título', PROPOSAL_FIELD_LIMITS.title),
    objective: campo('El objetivo', PROPOSAL_FIELD_LIMITS.objective),
    situation: campo('La situación a modificar', PROPOSAL_FIELD_LIMITS.situation),
    proposal: campo('La propuesta', PROPOSAL_FIELD_LIMITS.proposal),
    imageUrl: proposalImageUrlSchema,
  },
  { error: 'El cuerpo de la solicitud debe ser un objeto JSON' }
)
export type ProposalInput = z.output<typeof proposalInputSchema>

/** Query de GET /api/proposals-v2/admin. */
export const adminProposalsQuerySchema = z.object({
  includeInactive: queryBooleanSchema.optional(),
  authorId: playerIdSchema.optional(),
})
export type AdminProposalsQuery = z.output<typeof adminProposalsQuerySchema>
