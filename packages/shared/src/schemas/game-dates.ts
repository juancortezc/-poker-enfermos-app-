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

/**
 * Lista de ids de jugador sin repetidos. Un id repetido inflaba la cantidad de
 * participantes y, con ella, los puntos de toda la fecha: se rechaza (422) en
 * vez de deduplicar en silencio, para que el cliente con el defecto se note.
 */
export function uniquePlayerIdsSchema(field: string, opts: { min?: number; minMessage?: string } = {}) {
  const base = z.array(playerIdSchema, opts.minMessage ? { error: opts.minMessage } : undefined)
  const sized = opts.min ? base.min(opts.min, opts.minMessage) : base
  return sized.superRefine((ids, ctx) => {
    const seen = new Set<string>()
    const repeated = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) repeated.add(id)
      seen.add(id)
    }
    for (const id of repeated) {
      ctx.addIssue({
        code: 'custom',
        message: `Jugador repetido en ${field}: ${id}`,
        input: id,
      })
    }
  })
}

/**
 * Participantes que se guardan en la fecha: jugadores + invitados, sin
 * repetidos. Los clientes mandan los invitados dentro de `playerIds` (y a
 * veces también en `guestIds`); el formulario viejo los mandaba solo en
 * `guestIds` y la API los perdía.
 */
export function gameDateParticipantIds(playerIds: readonly string[], guestIds?: readonly string[] | null): string[] {
  return [...new Set([...playerIds, ...(guestIds ?? [])])]
}

/** POST /api/game-dates: configura (o recrea) una fecha del torneo. */
export const createGameDateSchema = z.object({
  tournamentId: intLikeSchema,
  dateNumber: intLikeSchema,
  /** 'YYYY-MM-DD' (al recrear una fecha borrada) o ISO completo. */
  scheduledDate: dateStringSchema,
  playerIds: uniquePlayerIdsSchema('playerIds', { min: 1, minMessage: 'Debe seleccionar al menos un jugador' }),
  guestIds: uniquePlayerIdsSchema('guestIds').default([]),
})
export type CreateGameDateBody = z.input<typeof createGameDateSchema>

/**
 * PUT /api/game-dates/[id]: `start` arranca la fecha y el timer; `update`
 * cambia jugadores y/o el dia de una fecha pendiente o configurada.
 */
export const updateGameDateSchema = z.object({
  action: z.enum(['start', 'update'], { error: 'Acción no válida: debe ser start o update' }),
  playerIds: uniquePlayerIdsSchema('playerIds', { min: 1, minMessage: 'Debe seleccionar al menos un jugador' }).optional(),
  guestIds: uniquePlayerIdsSchema('guestIds').nullish(),
  scheduledDate: z.union([dateStringSchema, z.literal('')]).nullish(),
})
export type UpdateGameDateBody = z.input<typeof updateGameDateSchema>

/** POST / DELETE /api/game-dates/[id]/players */
export const gameDatePlayerSchema = z.object({
  playerId: playerIdSchema,
})
export type GameDatePlayerBody = z.input<typeof gameDatePlayerSchema>
