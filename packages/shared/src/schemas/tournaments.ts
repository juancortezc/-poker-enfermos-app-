/** Esquemas de entrada de la API: torneos. */
import { z, intIdSchema, playerIdSchema, dateStringSchema, tournamentStatusSchema } from './common'

const blindLevelSchema = z.object({
  level: z.number().int().positive(),
  smallBlind: z.number().int().nonnegative(),
  bigBlind: z.number().int().nonnegative(),
  duration: z.number().int().nonnegative(),
})

/** GET /api/tournaments?status=ACTIVO */
export const tournamentListQuerySchema = z.object({
  status: tournamentStatusSchema.optional(),
})

/** POST /api/tournaments */
export const createTournamentSchema = z
  .object({
    number: z
      .number({ error: 'El número del torneo es obligatorio' })
      .int('El número del torneo debe ser entero')
      .min(1, 'El número del torneo es obligatorio'),
    gameDates: z.array(z.object({ scheduledDate: dateStringSchema }), {
      error: 'Debe programar las fechas del torneo',
    }),
    participantIds: z
      .array(playerIdSchema, { error: 'Debe seleccionar al menos un participante' })
      .min(1, 'Debe seleccionar al menos un participante'),
    blindLevels: z.array(blindLevelSchema).nullish(),
    totalDates: z
      .number()
      .int()
      .min(10, 'La cantidad de fechas debe estar entre 10 y 15')
      .max(15, 'La cantidad de fechas debe estar entre 10 y 15')
      .default(12),
    datesToEliminate: z
      .number()
      .int()
      .min(2, 'Las fechas a eliminar deben ser 2 o 3')
      .max(3, 'Las fechas a eliminar deben ser 2 o 3')
      .default(2),
  })
  .refine((t) => t.gameDates.length === t.totalDates, {
    message: 'La cantidad de fechas programadas no coincide con totalDates',
    path: ['gameDates'],
  })
export type CreateTournamentBody = z.input<typeof createTournamentSchema>

/** PUT /api/tournaments/[id]: todo opcional. */
export const updateTournamentSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede quedar vacío').optional(),
  status: tournamentStatusSchema.optional(),
  gameDates: z
    .array(
      z.object({
        id: intIdSchema,
        scheduledDate: dateStringSchema,
        playersMin: z.number().int().positive().nullish(),
        playersMax: z.number().int().positive().nullish(),
      })
    )
    .optional(),
  participantIds: z.array(playerIdSchema).optional(),
  blindLevels: z.array(blindLevelSchema).optional(),
})
export type UpdateTournamentBody = z.input<typeof updateTournamentSchema>

/** POST /api/tournaments/[id]/participants */
export const addTournamentParticipantSchema = z.object({
  playerId: playerIdSchema,
})

/** DELETE /api/tournaments/[id]/participants?playerId=... */
export const removeTournamentParticipantQuerySchema = z.object({
  playerId: playerIdSchema,
})

/** POST /api/tournaments/[id]/dates */
export const createTournamentDateSchema = z.object({
  dateNumber: z
    .number({ error: 'Número de fecha debe estar entre 1 y 12' })
    .int('Número de fecha debe estar entre 1 y 12')
    .min(1, 'Número de fecha debe estar entre 1 y 12')
    .max(12, 'Número de fecha debe estar entre 1 y 12'),
  scheduledDate: dateStringSchema,
  playersMin: z.number().int().positive().default(9),
  playersMax: z.number().int().positive().default(24),
})
export type CreateTournamentDateBody = z.input<typeof createTournamentDateSchema>

/** POST /api/tournaments/[id]/complete */
export const completeTournamentSchema = z.discriminatedUnion(
  'action',
  [
    z.object({ action: z.literal('modify_date'), endDate: dateStringSchema }),
    z.object({ action: z.literal('complete_tournament') }),
  ],
  { error: 'Acción inválida: debe ser modify_date o complete_tournament' }
)
export type CompleteTournamentBody = z.input<typeof completeTournamentSchema>
