/** Esquemas de entrada de la API: eliminaciones. */
import { z, intIdSchema, playerIdSchema } from './common'

/** null / undefined / '' = sin eliminador. */
const optionalEliminatorSchema = z
  .union([playerIdSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null))

/** POST /api/eliminations */
export const registerEliminationSchema = z.object({
  gameDateId: intIdSchema,
  position: intIdSchema,
  eliminatedPlayerId: playerIdSchema,
  eliminatorPlayerId: optionalEliminatorSchema,
})
export type RegisterEliminationBody = z.input<typeof registerEliminationSchema>
export type RegisterEliminationInput = z.output<typeof registerEliminationSchema>

/**
 * PUT /api/eliminations/[id]: solo cambia quien elimino a quien. Acepta los
 * nombres viejos (eliminatedId / eliminatorId). Posicion y puntos no se tocan.
 * eliminatorPlayerId null o vacio = no cambia (asi lo trataba la API).
 */
export const updateEliminationSchema = z
  .object({
    eliminatedPlayerId: playerIdSchema.nullish(),
    eliminatedId: playerIdSchema.nullish(),
    eliminatorPlayerId: z.union([playerIdSchema, z.literal(''), z.null()]).optional(),
    eliminatorId: z.union([playerIdSchema, z.literal(''), z.null()]).optional(),
    position: z.unknown().optional(),
    points: z.unknown().optional(),
  })
  .refine((b) => b.position === undefined && b.points === undefined, {
    message: 'No se puede cambiar la posición ni los puntos',
    path: ['position'],
  })
  .transform((b) => ({
    eliminatedPlayerId: (b.eliminatedPlayerId ?? b.eliminatedId) || undefined,
    eliminatorPlayerId: (b.eliminatorPlayerId ?? b.eliminatorId) || undefined,
  }))
export type UpdateEliminationBody = z.input<typeof updateEliminationSchema>
export type UpdateEliminationInput = z.output<typeof updateEliminationSchema>
