/** Esquemas de entrada de la API: fechas (game dates). */
import { z, intIdSchema, playerIdSchema, dateStringSchema } from './common'

/** Entero positivo que llega como numero o como texto ("3"). */
const intLikeSchema = z.union([
  intIdSchema,
  z
    .string()
    .regex(/^\d+$/, 'Debe ser un número entero positivo')
    .transform(Number)
    .pipe(intIdSchema),
])

/** POST /api/game-dates: configura (o recrea) una fecha del torneo. */
export const createGameDateSchema = z.object({
  tournamentId: intLikeSchema,
  dateNumber: intLikeSchema,
  /** 'YYYY-MM-DD' (al recrear una fecha borrada) o ISO completo. */
  scheduledDate: dateStringSchema,
  playerIds: z
    .array(playerIdSchema, { error: 'Debe seleccionar al menos un jugador' })
    .min(1, 'Debe seleccionar al menos un jugador'),
  guestIds: z.array(playerIdSchema).default([]),
})
export type CreateGameDateBody = z.input<typeof createGameDateSchema>

/**
 * PUT /api/game-dates/[id]: `start` arranca la fecha y el timer; `update`
 * cambia jugadores y/o el dia de una fecha configurada.
 */
export const updateGameDateSchema = z.object({
  action: z.enum(['start', 'update'], { error: 'Acción no válida: debe ser start o update' }),
  playerIds: z.array(playerIdSchema).optional(),
  guestIds: z.array(playerIdSchema).nullish(),
  scheduledDate: z.union([dateStringSchema, z.literal('')]).nullish(),
})
export type UpdateGameDateBody = z.input<typeof updateGameDateSchema>

/** POST / DELETE /api/game-dates/[id]/players */
export const gameDatePlayerSchema = z.object({
  playerId: playerIdSchema,
})
export type GameDatePlayerBody = z.input<typeof gameDatePlayerSchema>
