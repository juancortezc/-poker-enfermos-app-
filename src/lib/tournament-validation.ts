interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface ValidationError {
  field: string
  message: string
  type: 'error' | 'warning'
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

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

export const validateGameDates = (gameDates: Array<{
  dateNumber: number
  scheduledDate: string
}>): ValidationError[] => {
  const errors: ValidationError[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Debe tener exactamente 12 fechas
  if (gameDates.length !== 12) {
    errors.push({
      field: 'gameDates',
      message: 'Debe programar exactamente 12 fechas',
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
    if (scheduledDate.getDay() !== 2) {
      errors.push({
        field: `gameDate-${index}`,
        message: `La fecha ${date.dateNumber} debería ser un martes`,
        type: 'warning'
      })
    }
  })

  return errors
}

export const validateBlindLevels = (blindLevels: BlindLevel[]): ValidationError[] => {
  const errors: ValidationError[] = []

  if (blindLevels.length < 5) {
    errors.push({
      field: 'blindLevels',
      message: 'Debe tener al menos 5 niveles de blinds',
      type: 'error'
    })
  }

  if (blindLevels.length > 25) {
    errors.push({
      field: 'blindLevels',
      message: 'No puede tener más de 25 niveles de blinds',
      type: 'warning'
    })
  }

  blindLevels.forEach((blind, index) => {
    // Big blind debe ser mayor que small blind
    if (blind.bigBlind <= blind.smallBlind) {
      errors.push({
        field: `blindLevel-${index}-bigBlind`,
        message: `El big blind debe ser mayor que el small blind en el nivel ${blind.level}`,
        type: 'error'
      })
    }

    // Small blind debe ser positivo
    if (blind.smallBlind <= 0) {
      errors.push({
        field: `blindLevel-${index}-smallBlind`,
        message: `El small blind debe ser mayor a 0 en el nivel ${blind.level}`,
        type: 'error'
      })
    }

    // Duración debe ser válida
    if (blind.duration < 0) {
      errors.push({
        field: `blindLevel-${index}-duration`,
        message: `La duración no puede ser negativa en el nivel ${blind.level}`,
        type: 'error'
      })
    }

    // Verificar progresión lógica (cada nivel debería incrementar)
    if (index > 0) {
      const previousBlind = blindLevels[index - 1]
      if (blind.bigBlind <= previousBlind.bigBlind) {
        errors.push({
          field: `blindLevel-${index}-bigBlind`,
          message: `El big blind debería incrementar respecto al nivel anterior`,
          type: 'warning'
        })
      }
    }

    // Advertencia si el incremento es muy drástico
    if (index > 0) {
      const previousBlind = blindLevels[index - 1]
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

  // Solo validar el máximo, sin mostrar alertas molestas
  if (participantIds.length > 24) {
    errors.push({
      field: 'participants',
      message: 'Máximo 24 participantes por torneo',
      type: 'error'
    })
  }

  return errors
}

export const validateTournamentForm = (formData: {
  tournamentNumber: number
  gameDates: Array<{dateNumber: number, scheduledDate: string}>
  participantIds: string[]
  blindLevels: BlindLevel[]
}): ValidationResult => {
  const allErrors: ValidationError[] = []
  
  // No validar fechas en la UI (se valida solo en backend al enviar)
  // allErrors.push(...validateGameDates(formData.gameDates))
  
  // Validar blinds
  allErrors.push(...validateBlindLevels(formData.blindLevels))
  
  // Validar participantes
  allErrors.push(...validateParticipants(formData.participantIds))

  const errors = allErrors.filter(e => e.type === 'error')
  const warnings = allErrors.filter(e => e.type === 'warning')

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
