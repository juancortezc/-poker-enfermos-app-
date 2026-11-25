/**
 * Esquemas de entrada de la API: importacion de CSV y herramientas de
 * reparacion de la Comision (/api/admin/*).
 */
import { z, intIdSchema, queryIdSchema } from './common'

/** Una fila del CSV de eliminaciones, tal como la devuelve /api/admin/import/validate. */
export const csvEliminationSchema = z.object({
  torneo: z.string({ error: 'Falta el torneo' }).trim().min(1, 'Falta el torneo'),
  fecha: z.number({ error: 'La fecha debe ser un número' }).int('La fecha debe ser un número entero').positive('La fecha debe ser positiva'),
  date: z.string({ error: 'Falta la fecha' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (esperado: YYYY-MM-DD)'),
  posicion: z.number({ error: 'La posición debe ser un número' }).int('La posición debe ser un número entero').positive('La posición debe ser positiva'),
  eliminado: z.string({ error: 'Falta el jugador eliminado' }).trim().min(1, 'Falta el jugador eliminado'),
  eliminador: z.string().optional().default(''),
  puntos: z.number({ error: 'Los puntos deben ser un número' }).int('Los puntos deben ser un número entero').min(0, 'Los puntos no pueden ser negativos').max(30, 'Los puntos no pueden pasar de 30'),
})
export type CsvElimination = z.output<typeof csvEliminationSchema>

/** Body de POST /api/admin/import/execute. */
export const importExecuteSchema = z.object({
  eliminations: z
    .array(csvEliminationSchema, { error: 'No se proporcionaron eliminaciones válidas' })
    .min(1, 'No se proporcionaron eliminaciones válidas'),
})
export type ImportExecuteInput = z.output<typeof importExecuteSchema>

/** Body de POST /api/admin/fix-stuck-date. */
export const fixStuckDateSchema = z.object({
  gameDateId: intIdSchema,
})

/** Body de POST /api/admin/repair-tournament. */
export const repairTournamentSchema = z.object({
  tournamentId: intIdSchema,
})

/** Query de GET /api/admin/repair-tournament. */
export const repairTournamentQuerySchema = z.object({
  tournamentId: queryIdSchema,
})
