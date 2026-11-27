/**
 * Esquemas de entrada de la API: importacion de CSV y herramientas de
 * reparacion de la Comision (/api/admin/*).
 */
import { z, intIdSchema, queryIdSchema } from './common'
import { calculatePointsForPosition, getWinnerPoints } from '../points'

/**
 * Tope por fila: lo que da la tabla al ganador con 24 jugadores (31). El
 * tope fijo de 30 de antes rechazaba ese caso legítimo; el valor exacto de
 * cada fila lo comprueba `importRowsProblems`.
 */
const MAX_POINTS = getWinnerPoints(24)

/** Una fila del CSV de eliminaciones, tal como la devuelve /api/admin/import/validate. */
export const csvEliminationSchema = z.object({
  torneo: z.string({ error: 'Falta el torneo' }).trim().min(1, 'Falta el torneo'),
  fecha: z.number({ error: 'La fecha debe ser un número' }).int('La fecha debe ser un número entero').positive('La fecha debe ser positiva'),
  date: z.string({ error: 'Falta la fecha' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (esperado: YYYY-MM-DD)'),
  posicion: z.number({ error: 'La posición debe ser un número' }).int('La posición debe ser un número entero').positive('La posición debe ser positiva'),
  eliminado: z.string({ error: 'Falta el jugador eliminado' }).trim().min(1, 'Falta el jugador eliminado'),
  eliminador: z.string().optional().default(''),
  puntos: z.number({ error: 'Los puntos deben ser un número' }).int('Los puntos deben ser un número entero').min(0, 'Los puntos no pueden ser negativos').max(MAX_POINTS, `Los puntos no pueden pasar de ${MAX_POINTS}`),
})
export type CsvElimination = z.output<typeof csvEliminationSchema>

/** Un problema del CSV completo, con la fila (índice 0) cuando aplica. */
export interface ImportRowProblem {
  index?: number
  message: string
}

/**
 * Reglas del CSV completo (no de una fila suelta): todas las filas son de la
 * misma fecha, las posiciones van de 1 a N sin huecos ni repetidas, nadie
 * aparece eliminado dos veces y los puntos de cada fila son los de la tabla
 * oficial (`calculatePointsForPosition`) para N jugadores. La usan
 * /validate (para listar los errores) y /execute (para rechazar con 422).
 */
export function importRowsProblems(rows: readonly CsvElimination[]): ImportRowProblem[] {
  const problems: ImportRowProblem[] = []
  if (rows.length === 0) return [{ message: 'No se proporcionaron eliminaciones válidas' }]

  const first = rows[0]
  rows.forEach((r, index) => {
    if (r.torneo !== first.torneo || r.fecha !== first.fecha || r.date !== first.date) {
      problems.push({
        index,
        message: `Fila ${index + 1}: todas las filas deben ser de la misma fecha (${first.torneo}, fecha ${first.fecha}, ${first.date})`,
      })
    }
  })

  const total = rows.length
  const positions = new Map<number, number>()
  rows.forEach((r, index) => {
    if (positions.has(r.posicion)) {
      problems.push({ index, message: `Posición ${r.posicion} repetida` })
    } else {
      positions.set(r.posicion, index)
    }
    if (r.posicion > total) {
      problems.push({ index, message: `Posición ${r.posicion} fuera de rango: hay ${total} jugadores` })
    }
  })
  for (let p = 1; p <= total; p++) {
    if (!positions.has(p)) problems.push({ message: `Falta la posición ${p}` })
  }

  const names = new Set<string>()
  rows.forEach((r, index) => {
    const key = r.eliminado.trim().toLowerCase()
    if (names.has(key)) problems.push({ index, message: `${r.eliminado} aparece eliminado más de una vez` })
    names.add(key)
  })

  rows.forEach((r, index) => {
    if (r.posicion > total) return
    const expected = calculatePointsForPosition(r.posicion, total)
    if (r.puntos !== expected) {
      problems.push({
        index,
        message: `Posición ${r.posicion}: ${r.puntos} puntos, la tabla da ${expected} con ${total} jugadores`,
      })
    }
  })

  return problems
}

/** Body de POST /api/admin/import/execute. */
export const importExecuteSchema = z.object({
  eliminations: z
    .array(csvEliminationSchema, { error: 'No se proporcionaron eliminaciones válidas' })
    .min(1, 'No se proporcionaron eliminaciones válidas')
    .superRefine((rows, ctx) => {
      for (const p of importRowsProblems(rows)) {
        ctx.addIssue({ code: 'custom', message: p.message, path: p.index === undefined ? [] : [p.index] })
      }
    }),
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
