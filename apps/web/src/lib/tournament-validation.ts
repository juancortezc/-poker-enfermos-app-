import type { ValidationError } from '@poker/shared'

// Blinds, participantes y el formulario completo viven en @poker/shared
// (los usa tambien la app movil). Aqui quedan las que piden red o fechas.
export {
  validateBlindLevels,
  validateParticipants,
  validateTournamentConfig,
  validateTournamentForm
} from '@poker/shared'
export type { ValidationError, ValidationResult } from '@poker/shared'

export const validateTournamentNumber = async (
  number: number, 
  excludeId?: string,
  authHeader?: string
): Promise<ValidationError | null> => {
  if (!number || number < 1) {
    return {
      field: 'tournamentNumber',
      message: 'El número debe ser mayor a 0',
      type: 'error'
    }
  }

  if (number > 999) {
    return {
      field: 'tournamentNumber',
      message: 'El número debe ser menor a 1000',
      type: 'error'
    }
  }

  // Verificar si ya existe (solo si tenemos credenciales)
  if (authHeader) {
    try {
      const response = await fetch('/api/tournaments', {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const tournaments = await response.json()
        const existingTournament = tournaments.find((t: { number: number; id: string | number }) => 
          t.number === number && (!excludeId || t.id.toString() !== excludeId)
        )
        
        if (existingTournament) {
          return {
            field: 'tournamentNumber',
            message: `Ya existe un torneo con el número ${number}`,
            type: 'error'
          }
        }
      }
    } catch {
      // Si falla la verificación, no bloqueamos pero mostramos warning
      return {
        field: 'tournamentNumber',
        message: 'No se pudo verificar disponibilidad del número',
        type: 'warning'
      }
    }
  }

  return null
}

export const validateGameDates = (
  gameDates: Array<{
    dateNumber: number
    scheduledDate: string
  }>,
  totalDates: number = 12
): ValidationError[] => {
  const errors: ValidationError[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Validar totalDates está en rango permitido (10-15)
  if (totalDates < 10 || totalDates > 15) {
    errors.push({
      field: 'totalDates',
      message: 'La cantidad de fechas debe estar entre 10 y 15',
      type: 'error'
    })
  }

  // Debe tener exactamente totalDates fechas
  if (gameDates.length !== totalDates) {
    errors.push({
      field: 'gameDates',
      message: `Debe programar exactamente ${totalDates} fechas`,
      type: 'error'
    })
  }

  gameDates.forEach((date, index) => {
    if (!date.scheduledDate) {
      errors.push({
        field: `gameDate-${index}`,
        message: `La fecha ${date.dateNumber} es obligatoria`,
        type: 'error'
      })
      return
    }

    const scheduledDate = new Date(date.scheduledDate)
    
    // No puede ser en el pasado
    if (scheduledDate < today) {
      errors.push({
        field: `gameDate-${index}`,
        message: `La fecha ${date.dateNumber} no puede ser en el pasado`,
        type: 'error'
      })
    }

    // Verificar orden secuencial
    if (index > 0 && gameDates[index - 1].scheduledDate) {
      const previousDate = new Date(gameDates[index - 1].scheduledDate)
      if (scheduledDate <= previousDate) {
        errors.push({
          field: `gameDate-${index}`,
          message: `La fecha ${date.dateNumber} debe ser posterior a la fecha anterior`,
          type: 'error'
        })
      }
    }

    // Verificar que sea martes (día 2)
    // getUTCDay: scheduledDate se guarda a mediodía UTC (parseToUTCNoon).
    if (scheduledDate.getUTCDay() !== 2) {
      errors.push({
        field: `gameDate-${index}`,
        message: `La fecha ${date.dateNumber} debería ser un martes`,
        type: 'warning'
      })
    }
  })

  return errors
}

