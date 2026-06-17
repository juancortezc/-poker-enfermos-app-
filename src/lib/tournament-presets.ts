interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

interface TournamentPreset {
  id: string
  name: string
  description: string
  icon: string
  estimatedDuration: string
  blindLevels: BlindLevel[]
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    id: 'standard',
    name: 'Estándar',
    description: 'Configuración del grupo — descanso automático 20 min después del nivel 6',
    icon: '⚖️',
    estimatedDuration: '4-5 horas',
    blindLevels: [
      { level: 1,  smallBlind: 50,    bigBlind: 100,   duration: 12 },
      { level: 2,  smallBlind: 100,   bigBlind: 200,   duration: 12 },
      { level: 3,  smallBlind: 150,   bigBlind: 300,   duration: 12 },
      { level: 4,  smallBlind: 200,   bigBlind: 400,   duration: 12 },
      { level: 5,  smallBlind: 300,   bigBlind: 600,   duration: 12 },
      { level: 6,  smallBlind: 400,   bigBlind: 800,   duration: 12 },
      { level: 7,  smallBlind: 0,     bigBlind: 0,     duration: 20 },
      { level: 8,  smallBlind: 500,   bigBlind: 1000,  duration: 16 },
      { level: 9,  smallBlind: 600,   bigBlind: 1200,  duration: 16 },
      { level: 10, smallBlind: 800,   bigBlind: 1600,  duration: 16 },
      { level: 11, smallBlind: 1000,  bigBlind: 2000,  duration: 16 },
      { level: 12, smallBlind: 1500,  bigBlind: 3000,  duration: 16 },
      { level: 13, smallBlind: 2000,  bigBlind: 4000,  duration: 16 },
      { level: 14, smallBlind: 3000,  bigBlind: 6000,  duration: 16 },
      { level: 15, smallBlind: 4000,  bigBlind: 8000,  duration: 16 },
      { level: 16, smallBlind: 5000,  bigBlind: 10000, duration: 10 },
      { level: 17, smallBlind: 6000,  bigBlind: 12000, duration: 10 },
      { level: 18, smallBlind: 8000,  bigBlind: 16000, duration: 10 },
      { level: 19, smallBlind: 10000, bigBlind: 20000, duration: 0  },
    ]
  },
  {
    id: 'rapid',
    name: 'Rápido',
    description: 'Juego más dinámico y acelerado (2-3 horas)',
    icon: '⚡',
    estimatedDuration: '2-3 horas',
    blindLevels: [
      { level: 1, smallBlind: 50, bigBlind: 100, duration: 8 },
      { level: 2, smallBlind: 100, bigBlind: 200, duration: 8 },
      { level: 3, smallBlind: 200, bigBlind: 400, duration: 8 },
      { level: 4, smallBlind: 300, bigBlind: 600, duration: 8 },
      { level: 5, smallBlind: 500, bigBlind: 1000, duration: 10 },
      { level: 6, smallBlind: 800, bigBlind: 1600, duration: 10 },
      { level: 7, smallBlind: 1200, bigBlind: 2400, duration: 10 },
      { level: 8, smallBlind: 2000, bigBlind: 4000, duration: 10 },
      { level: 9, smallBlind: 3000, bigBlind: 6000, duration: 8 },
      { level: 10, smallBlind: 5000, bigBlind: 10000, duration: 8 },
      { level: 11, smallBlind: 8000, bigBlind: 16000, duration: 8 },
      { level: 12, smallBlind: 12000, bigBlind: 24000, duration: 8 },
      { level: 13, smallBlind: 20000, bigBlind: 40000, duration: 0 }
    ]
  },
  {
    id: 'marathon',
    name: 'Maratón',
    description: 'Juego extenso con mucha estrategia (4-6 horas)',
    icon: '🏃‍♂️',
    estimatedDuration: '4-6 horas',
    blindLevels: [
      { level: 1, smallBlind: 25, bigBlind: 50, duration: 15 },
      { level: 2, smallBlind: 50, bigBlind: 100, duration: 15 },
      { level: 3, smallBlind: 75, bigBlind: 150, duration: 15 },
      { level: 4, smallBlind: 100, bigBlind: 200, duration: 15 },
      { level: 5, smallBlind: 150, bigBlind: 300, duration: 15 },
      { level: 6, smallBlind: 200, bigBlind: 400, duration: 15 },
      { level: 7, smallBlind: 300, bigBlind: 600, duration: 20 },
      { level: 8, smallBlind: 400, bigBlind: 800, duration: 20 },
      { level: 9, smallBlind: 500, bigBlind: 1000, duration: 20 },
      { level: 10, smallBlind: 600, bigBlind: 1200, duration: 20 },
      { level: 11, smallBlind: 800, bigBlind: 1600, duration: 20 },
      { level: 12, smallBlind: 1000, bigBlind: 2000, duration: 20 },
      { level: 13, smallBlind: 1500, bigBlind: 3000, duration: 15 },
      { level: 14, smallBlind: 2000, bigBlind: 4000, duration: 15 },
      { level: 15, smallBlind: 3000, bigBlind: 6000, duration: 15 },
      { level: 16, smallBlind: 4000, bigBlind: 8000, duration: 15 },
      { level: 17, smallBlind: 5000, bigBlind: 10000, duration: 15 },
      { level: 18, smallBlind: 6000, bigBlind: 12000, duration: 15 },
      { level: 19, smallBlind: 8000, bigBlind: 16000, duration: 15 },
      { level: 20, smallBlind: 10000, bigBlind: 20000, duration: 0 }
    ]
  },
  {
    id: 'beginner',
    name: 'Principiante',
    description: 'Ideal para jugadores nuevos (2-3 horas)',
    icon: '🎯',
    estimatedDuration: '2-3 horas',
    blindLevels: [
      { level: 1, smallBlind: 25, bigBlind: 50, duration: 15 },
      { level: 2, smallBlind: 50, bigBlind: 100, duration: 15 },
      { level: 3, smallBlind: 100, bigBlind: 200, duration: 15 },
      { level: 4, smallBlind: 150, bigBlind: 300, duration: 15 },
      { level: 5, smallBlind: 250, bigBlind: 500, duration: 12 },
      { level: 6, smallBlind: 400, bigBlind: 800, duration: 12 },
      { level: 7, smallBlind: 600, bigBlind: 1200, duration: 12 },
      { level: 8, smallBlind: 1000, bigBlind: 2000, duration: 12 },
      { level: 9, smallBlind: 1500, bigBlind: 3000, duration: 10 },
      { level: 10, smallBlind: 2500, bigBlind: 5000, duration: 10 },
      { level: 11, smallBlind: 4000, bigBlind: 8000, duration: 10 },
      { level: 12, smallBlind: 6000, bigBlind: 12000, duration: 0 }
    ]
  }
]

export const getPresetById = (id: string): TournamentPreset | null => {
  return TOURNAMENT_PRESETS.find(preset => preset.id === id) || null
}

export const getPresetOptions = () => {
  return TOURNAMENT_PRESETS.map(preset => ({
    value: preset.id,
    label: preset.name,
    description: preset.description,
    icon: preset.icon,
    estimatedDuration: preset.estimatedDuration
  }))
}

export const calculateTournamentDuration = (blindLevels: BlindLevel[]): string => {
  const totalMinutes = blindLevels.reduce((total, level) => {
    return total + (level.duration === 0 ? 30 : level.duration) // Asumimos 30 min para último nivel
  }, 0)
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (hours === 0) {
    return `${minutes} min`
  } else if (minutes === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${minutes}min`
  }
}

export const validatePresetStructure = (blindLevels: BlindLevel[]): {
  isValid: boolean
  issues: string[]
} => {
  const issues: string[] = []
  
  if (blindLevels.length < 8) {
    issues.push('Muy pocos niveles para un torneo completo')
  }
  
  if (blindLevels.length > 25) {
    issues.push('Demasiados niveles, puede ser muy largo')
  }
  
  // Verificar progresión
  for (let i = 1; i < blindLevels.length; i++) {
    const current = blindLevels[i]
    const previous = blindLevels[i - 1]
    
    if (current.bigBlind <= previous.bigBlind) {
      issues.push(`Nivel ${current.level}: Los blinds no progresan correctamente`)
    }
    
    const ratio = current.bigBlind / previous.bigBlind
    if (ratio > 4) {
      issues.push(`Nivel ${current.level}: Incremento muy grande (${ratio.toFixed(1)}x)`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}