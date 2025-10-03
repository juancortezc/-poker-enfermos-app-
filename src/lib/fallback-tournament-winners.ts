export interface FallbackTournamentWinnerDefinition {
  tournamentNumber: number
  champion: string
  runnerUp: string
  thirdPlace: string
  siete: string
  dos: string
}

export const FALLBACK_TOURNAMENT_WINNERS: FallbackTournamentWinnerDefinition[] = [
  {
    tournamentNumber: 28,
    champion: 'Roddy Naranjo',
    runnerUp: 'Miguel Chiesa',
    thirdPlace: 'Juan Antonio Cortez',
    siete: 'Carlos Chacón',
    dos: 'Agustin Guerrero'
  }
]
