function escapeCsvCell(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Texto .csv a partir de encabezados + filas, con BOM para que Excel detecte
 * UTF-8. Descargarlo (web) o compartirlo (movil) lo hace cada cliente.
 */
export function buildCsv(headers: (string | number)[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','))
  return '﻿' + lines.join('\r\n')
}
