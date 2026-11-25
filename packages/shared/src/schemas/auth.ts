/** Esquemas de entrada de la API: autenticacion (/api/auth). */
import { z, playerIdSchema } from './common'
import { isValidPinForLogin, PIN_RULE_TEXT } from '../pin-rules'

/** Clave para entrar: 4..12 letras o numeros (ver pin-rules). */
export const loginPinSchema = z
  .string({ error: 'La clave debe ser texto' })
  .refine(isValidPinForLogin, `Clave inválida. ${PIN_RULE_TEXT}.`)

/**
 * Body de POST /api/auth/login: `{ pin }` o, legado, `{ adminKey }`.
 * Solo la forma: el formato de la clave lo comprueba la ruta (cuenta como
 * intento fallido) y la app con `loginPinSchema`.
 */
export const loginSchema = z.object({
  pin: z.string({ error: 'La clave debe ser texto' }).max(200).nullish(),
  adminKey: z.string({ error: 'La admin key debe ser texto' }).max(200).nullish(),
})
export type LoginInput = z.infer<typeof loginSchema>

/** `?id=<playerId>` de GET /api/auth/me. */
export const authMeQuerySchema = z.object({
  id: playerIdSchema,
})
