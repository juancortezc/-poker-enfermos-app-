/**
 * Validacion del cuerpo de POST/PATCH /api/proposals-v2. La regla vive en
 * @poker/shared (`proposalInputSchema`), compartida con la app movil; esto
 * es la envoltura que usan la UI web y las pruebas (tests/proposal-input.test.ts).
 */
import {
  proposalInputSchema,
  proposalImageUrlSchema,
  PROPOSAL_FIELD_LIMITS,
  PROPOSAL_IMAGE_URL_MAX,
  type ProposalInput,
} from '@poker/shared'

export { PROPOSAL_FIELD_LIMITS, PROPOSAL_IMAGE_URL_MAX }
export type { ProposalInput }

export type ProposalInputResult = { ok: true; value: ProposalInput } | { ok: false; error: string }

/** Solo `https:`. Ausente o vacia = null. */
export function normalizeImageUrl(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  const r = proposalImageUrlSchema.safeParse(raw)
  return r.success ? { ok: true, value: r.data } : { ok: false, error: r.error.issues[0]?.message ?? 'URL inválida' }
}

/** true si la URL se puede mostrar o abrir sin riesgo (para la UI). */
export function isSafeImageUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false
  const r = normalizeImageUrl(raw)
  return r.ok && r.value !== null
}

export function parseProposalInput(body: unknown): ProposalInputResult {
  const r = proposalInputSchema.safeParse(body)
  return r.success ? { ok: true, value: r.data } : { ok: false, error: r.error.issues[0]?.message ?? 'Datos inválidos' }
}
