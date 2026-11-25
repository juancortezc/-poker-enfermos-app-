/** Esquemas de entrada de la API: borrador del calendario (/api/calendar-draft). */
import { z } from './common'

const draftDateSchema = z.object({
  dateNumber: z.number({ error: 'dateNumber debe ser un número' }).int(),
  scheduledDate: z
    .string({ error: 'scheduledDate debe ser texto' })
    .refine((v) => !Number.isNaN(new Date(`${v}T12:00:00.000Z`).getTime()), 'Fecha inválida en el calendario'),
})

/** POST /api/calendar-draft: 10 a 15 fechas, numeradas 1..n en orden. */
export const calendarDraftSchema = z.object({
  tournamentNumber: z.number().int().positive().nullish(),
  gameDates: z
    .array(draftDateSchema, { error: 'Se requieren entre 10 y 15 fechas para el calendario.' })
    .min(10, 'Se requieren entre 10 y 15 fechas para el calendario.')
    .max(15, 'Se requieren entre 10 y 15 fechas para el calendario.')
    .refine((dates) => dates.every((d, i) => d.dateNumber === i + 1), 'Fechas inválidas en el calendario.'),
  approved: z.boolean().optional(),
})
export type CalendarDraftBody = z.input<typeof calendarDraftSchema>
