interface IcsEvent {
  uid: string
  title: string
  start: string // ISO date string
  durationHours?: number
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`)
}

/**
 * Genera un .ics con un VEVENT por fecha y dispara la descarga en el navegador.
 */
export function downloadSeasonIcs(events: IcsEvent[], filename: string) {
  const now = formatIcsDate(new Date())

  const veventBlocks = events.map((event) => {
    const start = new Date(event.start)
    const end = new Date(start)
    end.setHours(end.getHours() + (event.durationHours ?? 4))

    return [
      'BEGIN:VEVENT',
      `UID:${event.uid}@poker-enfermos`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      'END:VEVENT'
    ].join('\r\n')
  })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Poker Enfermos//Torneo//ES',
    'CALSCALE:GREGORIAN',
    ...veventBlocks,
    'END:VCALENDAR'
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
