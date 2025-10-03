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
    runnerUp: 'Freddy Lopez',
    thirdPlace: 'Fernando Peña',
    siete: 'Sean Willis',
    dos: 'Jose Luis Toral'
  }
]
