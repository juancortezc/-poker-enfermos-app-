/**
 * Calendario .ics de la temporada y enlace a Google Calendar. Aqui solo se
 * arma el texto; descargarlo (web) o compartirlo (movil) lo hace cada cliente.
 */

export interface IcsEvent {
  uid: string
  title: string
  /** Fecha ISO */
  start: string
  durationHours?: number
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`)
}

/** Un VEVENT por fecha, cada uno de `durationHours` (4 por defecto). */
export function buildSeasonIcs(events: IcsEvent[], now: Date = new Date()): string {
  const stamp = formatIcsDate(now)

  const veventBlocks = events.map((event) => {
    const start = new Date(event.start)
    const end = new Date(start)
    end.setHours(end.getHours() + (event.durationHours ?? 4))

    return [
      'BEGIN:VEVENT',
      `UID:${event.uid}@poker-enfermos`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      'END:VEVENT'
    ].join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Poker Enfermos//Torneo//ES',
    'CALSCALE:GREGORIAN',
    ...veventBlocks,
    'END:VCALENDAR'
  ].join('\r\n')
}

/** Enlace de Google Calendar con un evento de 4 horas para una fecha del torneo. */
export function googleCalendarUrl(dateNumber: number | undefined, scheduledDate: string): string {
  const eventDate = new Date(scheduledDate)
  const endDate = new Date(eventDate)
  endDate.setHours(endDate.getHours() + 4)
  const title = encodeURIComponent(`Poker Enfermos${dateNumber ? ` - Fecha ${dateNumber}` : ''}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatIcsDate(eventDate)}/${formatIcsDate(endDate)}`
}
