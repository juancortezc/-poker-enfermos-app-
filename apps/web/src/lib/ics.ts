import { buildSeasonIcs, type IcsEvent } from '@poker/shared'

/**
 * Genera un .ics con un VEVENT por fecha y dispara la descarga en el navegador.
 * El texto lo arma @poker/shared (la app movil lo comparte en vez de bajarlo).
 */
export function downloadSeasonIcs(events: IcsEvent[], filename: string) {
  const ics = buildSeasonIcs(events)

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
