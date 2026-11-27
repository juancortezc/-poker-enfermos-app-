/** Esquemas de entrada de la API: torneos. */
import { z, intIdSchema, playerIdSchema, dateStringSchema, tournamentStatusSchema } from './common'
import { MAX_TOURNAMENT_DATES, MIN_TOURNAMENT_DATES } from '../tournament-edit'

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

/**
 * PUT /api/tournaments/[id]: todo opcional. Las reglas de jugadores y
 * calendario están en tournament-edit.ts (planCalendarEdit,
 * planParticipantsEdit).
 */
export const updateTournamentSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre no puede quedar vacío').max(80, 'El nombre es demasiado largo').optional(),
    status: tournamentStatusSchema.optional(),
    /** Formato viejo: solo cambia el día de fechas existentes (por id). */
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
    /**
     * El calendario completo, en orden: con id, una fecha existente; sin id,
     * una nueva. Las que faltan se borran. El número de cada fecha es su
     * posición y totalDates pasa a ser el largo.
     */
    calendar: z
      .array(z.object({ id: intIdSchema.nullish(), scheduledDate: dateStringSchema }), {
        error: 'El calendario debe ser una lista de fechas',
      })
      .min(MIN_TOURNAMENT_DATES, `El torneo debe tener entre ${MIN_TOURNAMENT_DATES} y ${MAX_TOURNAMENT_DATES} fechas`)
      .max(MAX_TOURNAMENT_DATES, `El torneo debe tener entre ${MIN_TOURNAMENT_DATES} y ${MAX_TOURNAMENT_DATES} fechas`)
      .optional(),
    /** La lista completa de inscritos. */
    participantIds: z
      .array(playerIdSchema)
      .min(1, 'El torneo debe tener al menos un jugador inscrito')
      .optional(),
    blindLevels: z.array(blindLevelSchema).optional(),
  })
  .refine((t) => !(t.calendar && t.gameDates), {
    message: 'Envía calendar o gameDates, no ambos',
    path: ['calendar'],
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
