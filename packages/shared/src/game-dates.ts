/**
 * Fechas de juego: calendario de martes cada 15 días, todo a mediodía UTC.
 *
 * Venía de apps/web/src/lib/date-utils.ts; la web lo reexporta desde allí y la
 * app móvil lo usa para crear y editar torneos con las mismas reglas.
 * Una fecha de juego se guarda como mediodía UTC para que ningún huso la
 * corra al día anterior o siguiente.
 */

/** Date a mediodía UTC del día dado (mes 0-11). */
export function createUTCNoonDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0))
}

/** "YYYY-MM-DD" o ISO → Date a mediodía UTC de ese día calendario. */
export function parseToUTCNoon(dateString: string): Date {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number)
  return createUTCNoonDate(year, month - 1, day)
}

export const ECUADOR_TZ = 'America/Guayaquil'

/**
 * El día calendario de HOY en Ecuador, sin depender de la zona del proceso.
 *
 * En Vercel el servidor corre en UTC: a partir de las 19:00 de Ecuador
 * `new Date().getDate()` ya devuelve el día siguiente, justo cuando se juega.
 */
export function getEcuadorToday(): { year: number; month: number; day: number } {
  // 'en-CA' formatea como YYYY-MM-DD.
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: ECUADOR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .format(new Date())
    .split('-')
    .map(Number)

  return { year, month, day }
}

/** "YYYY-MM-DD" de hoy en Ecuador. */
export function getEcuadorTodayString(): string {
  const { year, month, day } = getEcuadorToday()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Hoy en Ecuador, como Date a mediodía UTC (comparable con scheduledDate). */
export function getEcuadorTodayAsUTCNoon(): Date {
  const { year, month, day } = getEcuadorToday()
  return createUTCNoonDate(year, month - 1, day)
}

/** Date → "YYYY-MM-DD" con los valores UTC. */
export function formatDateForInput(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 0 = domingo … 6 = sábado, en UTC. */
export function getUTCDayOfWeek(date: Date): number {
  return date.getUTCDay()
}

export function isUTCTuesday(date: Date): boolean {
  return getUTCDayOfWeek(date) === 2
}

/**
 * El próximo martes (estrictamente después de `fromDate`). Sin argumento se
 * parte de hoy en Ecuador: un lunes a las 20:00 en Ecuador ya es martes en UTC,
 * y calcular sobre eso saltaba el martes de mañana.
 */
export function getNextTuesday(fromDate?: Date): Date {
  const date = fromDate ? new Date(fromDate) : getEcuadorTodayAsUTCNoon()
  const dayOfWeek = date.getUTCDay()

  let daysToAdd = 2 - dayOfWeek
  if (daysToAdd <= 0) {
    daysToAdd += 7
  }

  const nextTuesday = new Date(date)
  nextTuesday.setUTCDate(date.getUTCDate() + daysToAdd)

  return createUTCNoonDate(
    nextTuesday.getUTCFullYear(),
    nextTuesday.getUTCMonth(),
    nextTuesday.getUTCDate()
  )
}

/**
 * Calendario del torneo: `count` fechas cada 14 días desde `startDate`
 * (sin ella, desde el próximo martes).
 */
export function generateTournamentDates(
  startDate?: Date,
  count: number = 12
): Array<{ dateNumber: number; scheduledDate: string }> {
  const firstTuesday = startDate ? parseToUTCNoon(startDate.toISOString()) : getNextTuesday()
  const dates = []

  for (let i = 0; i < count; i++) {
    const date = new Date(firstTuesday)
    date.setUTCDate(firstTuesday.getUTCDate() + i * 14)

    dates.push({
      dateNumber: i + 1,
      scheduledDate: formatDateForInput(date)
    })
  }

  return dates
}

/**
 * Cambia la fecha `index` y recalcula las siguientes cada 14 días desde ella,
 * como el formulario de torneo de la web. Devuelve un arreglo nuevo.
 */
export function rescheduleFrom(
  dates: ReadonlyArray<{ id?: number; dateNumber: number; scheduledDate: string }>,
  index: number,
  scheduledDate: string
): Array<{ id?: number; dateNumber: number; scheduledDate: string }> {
  const start = parseToUTCNoon(scheduledDate)
  if (isNaN(start.getTime())) return dates.map((d) => ({ ...d }))
  const regenerated = generateTournamentDates(start, dates.length - index)
  return dates.map((d, i) => (i < index ? { ...d } : { ...d, scheduledDate: regenerated[i - index].scheduledDate }))
}

/** Suma (o resta) días a un "YYYY-MM-DD". */
export function addDaysToDateString(dateString: string, days: number): string {
  const date = parseToUTCNoon(dateString)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateForInput(date)
}

/** Las fechas de juego son martes; mensaje en español si no lo es. */
export function validateTuesdayDate(dateString: string): { valid: boolean; message?: string } {
  try {
    const date = parseToUTCNoon(dateString)
    if (isNaN(date.getTime())) return { valid: false, message: 'Fecha inválida' }

    if (!isUTCTuesday(date)) {
      const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][getUTCDayOfWeek(date)]
      return {
        valid: false,
        message: `La fecha seleccionada es ${dayName}. Las fechas deben ser martes.`
      }
    }

    return { valid: true }
  } catch {
    return {
      valid: false,
      message: 'Fecha inválida'
    }
  }
}
