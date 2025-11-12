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
export function getNextTuesday(fromDate: Date = new Date()): Date {
  const date = new Date(fromDate)
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
  const today = createUTCNoonDate(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  )
  return date < today
}

/**
 * Gets the current date/time in Ecuador timezone (America/Guayaquil, UTC-5)
 * Ecuador does not observe daylight saving time
 */
export function getEcuadorDate(): Date {
  // Get current UTC time
  const now = new Date()

  // Ecuador is UTC-5 (no DST)
  const ecuadorOffset = -5 * 60 // minutes
  const localOffset = now.getTimezoneOffset() // minutes

  // Calculate the difference and adjust
  const offsetDiff = localOffset - ecuadorOffset
  const ecuadorTime = new Date(now.getTime() + offsetDiff * 60 * 1000)

  return ecuadorTime
}

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