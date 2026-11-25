/** Esquemas de entrada de la API: estadisticas (/api/stats/*). */
import { z, idParamSchema, playerIdSchema, queryIntSchema } from './common'

/** /api/stats/.../[tournamentId] */
export const tournamentIdParamsSchema = z.object({ tournamentId: idParamSchema })
export type TournamentIdParams = z.output<typeof tournamentIdParamsSchema>

/** /api/stats/date-awards/[gameDateId] */
export const gameDateIdParamsSchema = z.object({ gameDateId: idParamSchema })
export type GameDateIdParams = z.output<typeof gameDateIdParamsSchema>

/** /api/stats/parent-child/[tournamentId]/[relationId] */
export const parentChildRelationParamsSchema = z.object({
  tournamentId: idParamSchema,
  relationId: idParamSchema,
})

/** /api/stats/player-eliminations/[tournamentId]/[playerId] */
export const tournamentPlayerParamsSchema = z.object({
  tournamentId: idParamSchema,
  playerId: playerIdSchema,
})

/** Query de GET /api/stats/active-users: ventana en dias (1..365, por defecto 7). */
export const activeUsersQuerySchema = z.object({
  days: queryIntSchema
    .pipe(z.number().int().min(1, 'days debe ser al menos 1').max(365, 'days no puede pasar de 365'))
    .optional()
    .default(7),
})
export type ActiveUsersQuery = z.output<typeof activeUsersQuerySchema>
