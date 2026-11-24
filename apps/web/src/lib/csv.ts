import { buildCsv } from '@poker/shared'

/**
 * Genera un .csv a partir de encabezados + filas y dispara la descarga en el navegador.
 * El texto lo arma @poker/shared (la app movil lo comparte en vez de bajarlo).
 */
export function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = buildCsv(headers, rows)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
