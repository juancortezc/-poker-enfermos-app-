/**
 * Utility functions for consistent date handling across the application
 * All dates are stored as UTC noon to avoid timezone issues
 */

/**
 * Creates a date object at UTC noon for the given date components
 * This prevents timezone shifts when dates cross DST boundaries
 */
export function createUTCNoonDate(year: number, month: number, day: number): Date {
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0, 0))
  return date
}

/**
 * Parses a date string and returns a UTC noon date
 * @param dateString - Date string in YYYY-MM-DD or ISO format
 */
export function parseToUTCNoon(dateString: string): Date {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number)
  return createUTCNoonDate(year, month - 1, day) // month is 0-indexed
}

export const ECUADOR_TZ = 'America/Guayaquil'

/**
 * El día calendario de HOY en Ecuador, sin depender de la zona del proceso.
 *
 * Importa porque en Vercel el servidor corre en UTC: a partir de las 19:00 de
 * Ecuador, `new Date().getDate()` ya devuelve el día siguiente — justo la
 * franja en la que se juega. Ecuador no tiene horario de verano, pero se usa
 * Intl con la zona en vez de restar 5 horas a mano para no repetir el error
 * de tratar un instante como si fuera hora local.
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

/**
 * Formats a date to YYYY-MM-DD string
 * Uses UTC values to prevent timezone shifts
 */
export function formatDateForInput(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formats a date for display (e.g., "Mar 15, 2024")
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * Gets the day of week for a UTC date
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function getUTCDayOfWeek(date: Date): number {
  return date.getUTCDay()
}

/**
 * Checks if a date is a Tuesday (in UTC)
 */
export function isUTCTuesday(date: Date): boolean {
  return getUTCDayOfWeek(date) === 2
}

/**
 * Gets the next Tuesday from a given date
 * @param fromDate - Starting date (defaults to today)
 */
export function getNextTuesday(fromDate?: Date): Date {
  // Sin argumento se parte de hoy en Ecuador: un lunes a las 20:00 en Ecuador
  // ya es martes en UTC, y calcular sobre eso saltaba el martes de mañana y
  // devolvía el de la semana siguiente.
  const date = fromDate ? new Date(fromDate) : getEcuadorTodayAsUTCNoon()
  const dayOfWeek = date.getUTCDay()
  
  let daysToAdd = 2 - dayOfWeek // 2 = Tuesday
  if (daysToAdd <= 0) {
    daysToAdd += 7 // Next Tuesday
  }
  
  const nextTuesday = new Date(date)
  nextTuesday.setUTCDate(date.getUTCDate() + daysToAdd)
  
  // Set to UTC noon
  return createUTCNoonDate(
    nextTuesday.getUTCFullYear(),
    nextTuesday.getUTCMonth(),
    nextTuesday.getUTCDate()
  )
}

/**
 * Generates tournament dates, every 2 weeks on Tuesdays
 * @param startDate - First Tuesday (defaults to next Tuesday)
 * @param count - Number of dates to generate (defaults to 12)
 */
export function generateTournamentDates(startDate?: Date, count: number = 12): Array<{ dateNumber: number; scheduledDate: string }> {
  const firstTuesday = startDate ? parseToUTCNoon(startDate.toISOString()) : getNextTuesday()
  const dates = []
  
  for (let i = 0; i < count; i++) {
    const date = new Date(firstTuesday)
    date.setUTCDate(firstTuesday.getUTCDate() + (i * 14)) // Every 2 weeks
    
    dates.push({
      dateNumber: i + 1,
      scheduledDate: formatDateForInput(date)
    })
  }
  
  return dates
}

/**
 * Validates if a date string represents a valid Tuesday
 */
export function validateTuesdayDate(dateString: string): { valid: boolean; message?: string } {
  try {
    const date = parseToUTCNoon(dateString)
    
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

/**
 * Compares two dates ignoring time component
 */
export function isSameDate(date1: Date, date2: Date): boolean {
  return formatDateForInput(date1) === formatDateForInput(date2)
}

/**
 * Checks if a date is in the past (comparing only date, not time)
 */
export function isDateInPast(date: Date): boolean {
  return date < getEcuadorTodayAsUTCNoon()
}

/**
 * NO USAR para guardar marcas de tiempo.
 *
 * Existía un getEcuadorDate() que le sumaba un offset a `new Date()` para
 * "convertirlo" a hora de Ecuador. Un Date de JS es un instante absoluto: el
 * offset solo aplica al mostrarlo. Al desplazarlo se guardaba un instante que
 * no era el real — en el servidor daba +10 horas, y el timer de blinds
 * arrancaba con levelStartTime en el futuro.
 *
 * Para guardar: new Date(). Para mostrar en hora de Ecuador:
 * formatEcuadorDateTime() / formatEcuadorDate(), que usan timeZone.
 */


/**
 * Formats a date to Ecuador timezone for display
 */
export function formatEcuadorDateTime(date: Date): string {
  return date.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * Formats a date to Ecuador timezone date only
 */
export function formatEcuadorDate(date: Date): string {
  return date.toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}