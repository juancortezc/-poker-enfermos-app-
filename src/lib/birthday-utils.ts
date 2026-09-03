/** Parsea "YYYY-MM-DD" o "MM-DD" y devuelve {month, day} (1-12, 1-31), o null si es inválido. */
export function parseBirthMonthDay(birthDate: string | null | undefined): { month: number; day: number } | null {
  if (!birthDate) return null
  const parts = birthDate.split('-')
  let month: number
  let day: number
  if (parts.length === 3) {
    month = parseInt(parts[1], 10)
    day = parseInt(parts[2], 10)
  } else if (parts.length === 2) {
    month = parseInt(parts[0], 10)
    day = parseInt(parts[1], 10)
  } else {
    return null
  }
  if (isNaN(month) || isNaN(day)) return null
  return { month, day }
}

/** true si el mes/día de `birthDate` cae dentro de `toleranceDays` de `targetDate` (mismo año no importa). */
export function isBirthdayNearDate(birthDate: string | null | undefined, targetDate: Date, toleranceDays = 1): boolean {
  const parsed = parseBirthMonthDay(birthDate)
  if (!parsed) return false

  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  for (let offset = -toleranceDays; offset <= toleranceDays; offset++) {
    const check = new Date(target)
    check.setDate(check.getDate() + offset)
    if (check.getMonth() + 1 === parsed.month && check.getDate() === parsed.day) {
      return true
    }
  }
  return false
}
