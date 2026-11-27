/** Esquemas de entrada de la API: jugadores (/api/players). */
import { z, userRoleSchema, queryBooleanSchema, queryIdSchema, playerIdSchema } from './common'
import { GUEST_GENERIC_NAME_MESSAGE, isGenericGuestName } from '../guests'

/** Texto opcional que se guarda tal cual (null o ausente = sin dato). */
const optionalText = z.string({ error: 'Debe ser texto' }).max(500, 'Texto demasiado largo').nullish()

/** Año de ingreso al grupo. */
export const joinYearSchema = z
  .number({ error: 'El año debe ser un número' })
  .int('El año debe ser un número entero')
  .min(1900, 'Año inválido')
  .max(2100, 'Año inválido')

/** `?role=Enfermo,Comision&search=x&includeInactive=true` de GET /api/players. */
export const playersQuerySchema = z.object({
  role: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((r) => r.trim()) : undefined))
    .pipe(z.array(userRoleSchema).min(1).optional()),
  search: z.string().max(100, 'Búsqueda demasiado larga').optional(),
  includeInactive: queryBooleanSchema.optional(),
})
export type PlayersQuery = z.infer<typeof playersQuerySchema>

/**
 * POST /api/players. El apellido es opcional solo para invitados: se
 * registran con un nombre de referencia ("Sobrino Diego"). La clave, si
 * viene, se valida (formato y unicidad) en el servidor.
 */
export const createPlayerSchema = z
  .object({
    firstName: z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(100),
    lastName: z.string({ error: 'El apellido debe ser texto' }).trim().max(100).nullish(),
    role: userRoleSchema,
    aliases: z.array(z.string({ error: 'Cada alias debe ser texto' }).max(100)).max(20).default([]),
    pin: z.string({ error: 'La clave debe ser texto' }).nullish(),
    birthDate: optionalText,
    phone: optionalText,
    email: optionalText,
    inviterId: playerIdSchema.nullish(),
    photoUrl: optionalText,
    joinYear: joinYearSchema.nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.role !== 'Invitado' && !v.lastName) {
      ctx.addIssue({ code: 'custom', path: ['lastName'], message: 'El apellido es obligatorio' })
    }
  })
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>

/**
 * PUT /api/players/[id]. Todo opcional: lo ausente no se toca. Que el
 * apellido vacio solo valga para invitados depende del rol guardado, asi que
 * eso lo decide el servidor.
 */
export const updatePlayerSchema = z.object({
  firstName: z.string({ error: 'El nombre debe ser texto' }).trim().min(1, 'El nombre es obligatorio').max(100).optional(),
  lastName: z.string({ error: 'El apellido debe ser texto' }).trim().max(100).optional(),
  aliases: z.array(z.string({ error: 'Cada alias debe ser texto' }).max(100)).max(20).optional(),
  pin: z.string({ error: 'La clave debe ser texto' }).optional(),
  birthDate: optionalText,
  phone: optionalText,
  email: optionalText,
  role: userRoleSchema.optional(),
  inviterId: playerIdSchema.nullish(),
  photoUrl: optionalText,
  isActive: z.boolean({ error: 'isActive debe ser true o false' }).optional(),
  joinYear: joinYearSchema.optional(),
})
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>

/** PATCH /api/players/[id]/role. Un invitado necesita quien lo invite. */
export const changePlayerRoleSchema = z
  .object({
    newRole: userRoleSchema,
    inviterId: playerIdSchema.nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.newRole === 'Invitado' && !v.inviterId) {
      ctx.addIssue({
        code: 'custom',
        path: ['inviterId'],
        message: 'Los invitados deben tener un Enfermo que los invite',
      })
    }
  })
export type ChangePlayerRoleInput = z.infer<typeof changePlayerRoleSchema>

/** Nombre o apellido real de un invitado: recortado, 2+ letras, nada de "Invitado" o "Sobrino X". */
function guestNamePart(label: string) {
  return z
    .string({ error: `${label} es obligatorio` })
    .trim()
    .min(2, `${label} debe tener al menos 2 letras`)
    .max(100, `${label} es demasiado largo`)
    .refine((v) => !isGenericGuestName(v), GUEST_GENERIC_NAME_MESSAGE)
}

/**
 * POST /api/players/guests: alta rapida de un invitado externo desde el
 * selector de la fecha. Nombre y apellido reales y quien lo invita (un
 * Enfermo o Comision activo, eso lo comprueba el servidor).
 */
export const createGuestSchema = z.object({
  firstName: guestNamePart('El nombre'),
  lastName: guestNamePart('El apellido'),
  inviterId: z
    .string({ error: 'Elige quién lo invita' })
    .trim()
    .min(1, 'Elige quién lo invita')
    .max(64, 'Id de jugador inválido'),
})
export type CreateGuestInput = z.infer<typeof createGuestSchema>

/** `?tournamentId=3` (opcional) de GET /api/players/available-guests. */
export const availableGuestsQuerySchema = z.object({
  tournamentId: queryIdSchema.optional(),
})

/** `{ id }` de /api/players/[id] (cuid). */
export const playerIdParamsSchema = z.object({ id: playerIdSchema })
