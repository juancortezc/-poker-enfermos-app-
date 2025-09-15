import TournamentForm from '@/components/tournaments/TournamentForm'

interface PageProps {
  searchParams: Promise<{ number?: string }>
}

export default async function ConfigureTournament({ searchParams }: PageProps) {
  const params = await searchParams
  const initialTournamentNumber = params.number ? parseInt(params.number) : undefined
  
  return <TournamentForm initialTournamentNumber={initialTournamentNumber} />
}

export const metadata = {
  title: 'Configurar Torneo - Poker de Enfermos',
  description: 'Configurar nuevo torneo'
}