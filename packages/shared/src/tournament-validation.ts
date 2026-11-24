/**
 * Validación del formulario de torneo (blinds y participantes). Venía de
 * apps/web/src/lib/tournament-validation.ts; la web la reexporta y la app
 * móvil la usa igual, así ambas bloquean lo mismo antes de enviar.
 */
import type { BlindLevel } from './blinds'

export interface ValidationError {
  field: string
  message: string
  type: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export const validateBlindLevels = (blindLevels: BlindLevel[]): ValidationError[] => {
  const errors: ValidationError[] = []

  if (blindLevels.length < 5) {
    errors.push({ field: 'blindLevels', message: 'Debe tener al menos 5 niveles de blinds', type: 'error' })
  }

  if (blindLevels.length > 25) {
    errors.push({ field: 'blindLevels', message: 'No puede tener más de 25 niveles de blinds', type: 'warning' })
  }

  blindLevels.forEach((blind, index) => {
    if (blind.bigBlind <= blind.smallBlind) {
      errors.push({
        field: `blindLevel-${index}-bigBlind`,
        message: `El big blind debe ser mayor que el small blind en el nivel ${blind.level}`,
        type: 'error'
      })
    }

    if (blind.smallBlind <= 0) {
      errors.push({
        field: `blindLevel-${index}-smallBlind`,
        message: `El small blind debe ser mayor a 0 en el nivel ${blind.level}`,
        type: 'error'
      })
    }

    if (blind.duration < 0) {
      errors.push({
        field: `blindLevel-${index}-duration`,
        message: `La duración no puede ser negativa en el nivel ${blind.level}`,
        type: 'error'
      })
    }

    if (index > 0) {
      const previousBlind = blindLevels[index - 1]
      if (blind.bigBlind <= previousBlind.bigBlind) {
        errors.push({
          field: `blindLevel-${index}-bigBlind`,
          message: `El big blind debería incrementar respecto al nivel anterior`,
          type: 'warning'
        })
      }

      const increment = blind.bigBlind / previousBlind.bigBlind
      if (increment > 3) {
        errors.push({
          field: `blindLevel-${index}-bigBlind`,
          message: `El incremento del nivel ${blind.level} es muy alto (${increment.toFixed(1)}x)`,
          type: 'warning'
        })
      }
    }
  })

  return errors
}

export const validateParticipants = (participantIds: string[]): ValidationError[] => {
  const errors: ValidationError[] = []

  // Solo el máximo, sin alertas molestas.
  if (participantIds.length > 24) {
    errors.push({ field: 'participants', message: 'Máximo 24 participantes por torneo', type: 'error' })
  }

  return errors
}

export const validateTournamentConfig = (totalDates: number, datesToEliminate: number): ValidationError[] => {
  const errors: ValidationError[] = []

  if (totalDates < 10 || totalDates > 15) {
    errors.push({ field: 'totalDates', message: 'La cantidad de fechas debe estar entre 10 y 15', type: 'error' })
  }

  if (datesToEliminate < 2 || datesToEliminate > 3) {
    errors.push({ field: 'datesToEliminate', message: 'Las fechas a eliminar deben ser 2 o 3', type: 'error' })
  }

  return errors
}

export const validateTournamentForm = (formData: {
  tournamentNumber: number
  gameDates: Array<{ dateNumber: number; scheduledDate: string }>
  participantIds: string[]
  blindLevels: BlindLevel[]
}): ValidationResult => {
  const allErrors: ValidationError[] = []

  // Las fechas no se validan en la UI (las valida el backend al enviar).
  allErrors.push(...validateBlindLevels(formData.blindLevels))
  allErrors.push(...validateParticipants(formData.participantIds))

  const errors = allErrors.filter((e) => e.type === 'error')
  const warnings = allErrors.filter((e) => e.type === 'warning')

  return { isValid: errors.length === 0, errors, warnings }
}
