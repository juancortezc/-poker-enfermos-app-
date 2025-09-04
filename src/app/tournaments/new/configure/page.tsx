import TournamentForm from '@/components/tournaments/TournamentForm'

interface PageProps {
  searchParams: { number?: string }
}

export default function ConfigureTournament({ searchParams }: PageProps) {
  const initialTournamentNumber = searchParams.number ? parseInt(searchParams.number) : undefined
  
  return <TournamentForm initialTournamentNumber={initialTournamentNumber} />
}

export const metadata = {
  title: 'Configurar Torneo - Poker de Enfermos',
  description: 'Configurar nuevo torneo'
}