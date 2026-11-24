/**
 * Utility functions for consistent date handling across the application
 * All dates are stored as UTC noon to avoid timezone issues
 *
 * Las reglas del calendario (mediodia UTC, martes, cada 15 dias) viven en
 * @poker/shared/game-dates para que la app movil use las mismas; aqui se
 * reexportan con los nombres de siempre.
 */
import { formatDateForInput, getEcuadorTodayAsUTCNoon } from '@poker/shared'

export {
  createUTCNoonDate,
  parseToUTCNoon,
  ECUADOR_TZ,
  getEcuadorToday,
  getEcuadorTodayString,
  getEcuadorTodayAsUTCNoon,
  formatDateForInput,
  getUTCDayOfWeek,
  isUTCTuesday,
  getNextTuesday,
  generateTournamentDates,
  validateTuesdayDate
} from '@poker/shared'

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