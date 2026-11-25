/** Esquemas de entrada de la API: multas (/api/multas). */
import { z, playerIdSchema, queryIdSchema } from './common'

/** Numero o texto numerico de un formulario ('5' -> 5). Entero: se trunca, como parseInt. */
const intLike = z
  .union([z.number(), z.string().trim()], { error: 'Debe ser un número' })
  .transform((v) => (typeof v === 'number' ? Math.trunc(v) : parseInt(v, 10)))
  .pipe(z.number({ error: 'Debe ser un número' }).int().min(-1000000).max(1000000))

const floatLike = z
  .union([z.number(), z.string().trim()], { error: 'Debe ser un número' })
  .transform((v) => (typeof v === 'number' ? v : parseFloat(v)))
  .pipe(z.number({ error: 'Debe ser un número' }).min(-1000000).max(1000000))

/** Vacio (0, '', null, ausente) = sin dato. */
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || v === 0 || v === false

/** `?tournamentId=3&playerId=x` de GET /api/multas. */
export const multasQuerySchema = z.object({
  tournamentId: queryIdSchema.optional(),
  playerId: playerIdSchema.optional(),
})

/** POST /api/multas. Puntos vacio = 0; fichas o dinero vacios = null. */
export const createMultaSchema = z.object({
  tournamentId: z.preprocess((v) => (isEmpty(v) ? undefined : v), intLike.pipe(z.number().positive('Torneo inválido'))),
  playerId: playerIdSchema,
  reason: z.string({ error: 'La razón es obligatoria' }).min(1, 'La razón es obligatoria').max(500),
  pointsPenalty: z.preprocess((v) => (isEmpty(v) ? 0 : v), intLike),
  chipsAmount: z.preprocess((v) => (isEmpty(v) ? null : v), intLike.nullable()),
  moneyAmount: z.preprocess((v) => (isEmpty(v) ? null : v), floatLike.nullable()),
  paid: z.boolean({ error: 'paid debe ser true o false' }).nullish().transform((v) => v ?? false),
})
export type CreateMultaInput = z.infer<typeof createMultaSchema>

/** PATCH /api/multas/[id]. Lo ausente no se toca; null en fichas o dinero lo borra. */
export const updateMultaSchema = z.object({
  reason: z.string({ error: 'La razón debe ser texto' }).min(1, 'La razón es obligatoria').max(500).optional(),
  pointsPenalty: intLike.optional(),
  chipsAmount: intLike.nullable().optional(),
  moneyAmount: floatLike.nullable().optional(),
  paid: z.boolean({ error: 'paid debe ser true o false' }).optional(),
})
export type UpdateMultaInput = z.infer<typeof updateMultaSchema>
