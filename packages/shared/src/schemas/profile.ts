/** Esquemas de entrada de la API: perfil propio (/api/profile). */
import { z } from './common'
import { PIN_RULE_TEXT } from '../pin-rules'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * PUT /api/profile. Lo ausente no se toca; `''`/null en email o telefono lo
 * borra. La clave vacia no cambia nada; si viene, el servidor la valida
 * (formato de pin-rules y que no este en uso) y la hashea.
 */
export const updateProfileSchema = z.object({
  pin: z.string({ error: `La clave debe tener ${PIN_RULE_TEXT.toLowerCase()}` }).max(200).nullish(),
  birthDate: z.string({ error: 'Fecha de nacimiento inválida' }).max(50, 'Fecha de nacimiento inválida').nullish(),
  email: z
    .string({ error: 'Correo electrónico inválido' })
    .max(200, 'Correo electrónico inválido')
    .refine((v) => v === '' || EMAIL_RE.test(v), 'Correo electrónico inválido')
    .nullish(),
  phone: z.string({ error: 'Teléfono inválido' }).max(50, 'Teléfono inválido').nullish(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
