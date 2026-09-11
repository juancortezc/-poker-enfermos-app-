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
