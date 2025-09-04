import TournamentForm from '@/components/tournaments/TournamentForm'

interface EditTournamentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditTournamentPage({ params }: EditTournamentPageProps) {
  const { id } = await params
  
  return <TournamentForm tournamentId={id} />
}

export const metadata = {
  title: 'Editar Torneo - Poker Enfermos',
  description: 'Editar configuración del torneo'
}