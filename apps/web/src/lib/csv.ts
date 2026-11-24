function escapeCsvCell(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Genera un .csv a partir de encabezados + filas y dispara la descarga en el navegador.
 */
export function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','))
  const csv = '﻿' + lines.join('\r\n') // BOM para que Excel detecte UTF-8

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
