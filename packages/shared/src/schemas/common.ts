/**
 * Piezas comunes de los esquemas de entrada de la API (Zod 4).
 *
 * Los esquemas viven aqui, en @poker/shared, para que la web (API) y la app
 * movil (formularios) validen con exactamente las mismas reglas. Los mensajes
 * por defecto de Zod salen en espanol (locale `es`); los propios tambien.
 */
import { z } from 'zod'

z.config(z.locales.es())

export { z }

const MAX_INT = 2147483647

/** Id numerico (tournaments, game_dates, eliminations...) en la ruta: "12" -> 12. */
export const idParamSchema = z
  .string()
  .regex(/^\d+$/, 'El id debe ser un número entero positivo')
  .transform(Number)
  .pipe(z.number().int().positive('El id debe ser un número entero positivo').max(MAX_INT, 'Id fuera de rango'))

/** Id numerico en un body JSON. */
export const intIdSchema = z
  .number({ error: 'Debe ser un número' })
  .int('Debe ser un número entero')
  .positive('Debe ser un número positivo')
  .max(MAX_INT, 'Número fuera de rango')

/** Id de jugador (cuid). */
export const playerIdSchema = z
  .string({ error: 'Falta el id del jugador' })
  .trim()
  .min(1, 'Falta el id del jugador')
  .max(64, 'Id de jugador inválido')

/** Fecha 'YYYY-MM-DD' (o ISO completo) que se pueda interpretar. */
export const dateStringSchema = z
  .string({ error: 'Falta la fecha' })
  .min(1, 'Falta la fecha')
  .refine(
    (v) => !Number.isNaN(new Date(v.length === 10 ? `${v}T12:00:00.000Z` : v).getTime()),
    'Fecha inválida'
  )

/** Booleano de query string: 'true' | 'false' | '1' | '0'. */
export const queryBooleanSchema = z
  .enum(['true', 'false', '1', '0'], { error: 'Debe ser true o false' })
  .transform((v) => v === 'true' || v === '1')

/** Entero de query string ('20' -> 20). */
export const queryIntSchema = z
  .string()
  .regex(/^-?\d+$/, 'Debe ser un número entero')
  .transform(Number)

/** Id numerico en query string (?tournamentId=3). */
export const queryIdSchema = idParamSchema

export const userRoleSchema = z.enum(['Comision', 'Enfermo', 'Invitado'], {
  error: 'Rol inválido: debe ser Comision, Enfermo o Invitado',
})

export const tournamentStatusSchema = z.enum(['ACTIVO', 'FINALIZADO'], {
  error: 'Estado de torneo inválido: debe ser ACTIVO o FINALIZADO',
})

/** `{ id }` de la ruta: /api/x/[id] con id numerico. */
export const idParamsSchema = z.object({ id: idParamSchema })
export type IdParams = z.infer<typeof idParamsSchema>
