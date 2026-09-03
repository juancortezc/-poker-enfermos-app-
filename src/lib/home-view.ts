export const RECAP_WINDOW_HOURS = 48

/**
 * true si `scheduledDate` (la fecha programada de la última fecha completada)
 * cayó dentro de las últimas `hours` horas — usado para decidir qué vista de
 * home mostrar por defecto ("Última Fecha" vs "Torneo").
 */
export function isWithinRecapWindow(scheduledDate: string | null | undefined, hours: number = RECAP_WINDOW_HOURS): boolean {
  if (!scheduledDate) return false
  const diffMs = Date.now() - new Date(scheduledDate).getTime()
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000
}

/**
 * Abre Google Calendar con un evento pre-armado para una fecha de torneo.
 */
export function openAddToCalendar(dateNumber: number | undefined, scheduledDate: string | null | undefined) {
  if (!scheduledDate) return

  const eventDate = new Date(scheduledDate)
  const endDate = new Date(eventDate)
  endDate.setHours(endDate.getHours() + 4) // 4 hour event

  const formatDateForCal = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const title = encodeURIComponent(`Poker Enfermos${dateNumber ? ` - Fecha ${dateNumber}` : ''}`)
  const startStr = formatDateForCal(eventDate)
  const endStr = formatDateForCal(endDate)

  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}`
  window.open(calendarUrl, '_blank')
}
