import { googleCalendarUrl } from '@poker/shared'

/**
 * Abre Google Calendar con un evento pre-armado para una fecha de torneo.
 */
export function openAddToCalendar(dateNumber: number | undefined, scheduledDate: string | null | undefined) {
  if (!scheduledDate) return
  window.open(googleCalendarUrl(dateNumber, scheduledDate), '_blank')
}
